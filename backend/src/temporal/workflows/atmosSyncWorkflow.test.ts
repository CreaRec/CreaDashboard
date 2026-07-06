import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { SmtSyncStatus } from '@prisma/client';
import { atmosSyncWorkflow } from './atmosSyncWorkflow';

describe('atmosSyncWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  async function runWorkflow(
    activities: Record<string, (...args: never[]) => Promise<unknown>>
  ) {
    const { client, nativeConnection } = testEnv;
    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-atmos-sync',
      workflowsPath: path.resolve(__dirname, './index.ts'),
      activities,
    });

    return worker.runUntil(async () =>
      client.workflow.execute(atmosSyncWorkflow, {
        taskQueue: 'test-atmos-sync',
        workflowId: `test-atmos-sync-${Date.now()}-${Math.random()}`,
        args: [],
      })
    );
  }

  it('returns skipped when Atmos is not configured', async () => {
    const result = await runWorkflow({
      checkAtmosConfigured: async () => false,
      syncGasReadings: async () => 0,
      logAtmosSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'Atmos Energy not configured',
    });
  });

  it('runs full sync successfully', async () => {
    const result = await runWorkflow({
      checkAtmosConfigured: async () => true,
      syncGasReadings: async () => 6,
      logAtmosSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 6,
    });
  });

  it('logs and returns error when an activity fails', async () => {
    const result = await runWorkflow({
      checkAtmosConfigured: async () => true,
      syncGasReadings: async () => {
        throw new Error('portal unavailable');
      },
      logAtmosSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.error,
      recordsCount: 0,
      error: 'portal unavailable',
    });
  });
});
