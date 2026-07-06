import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { SmtSyncStatus } from '@prisma/client';
import { championSyncWorkflow } from './championSyncWorkflow';

describe('championSyncWorkflow', () => {
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
      taskQueue: 'test-champion-sync',
      workflowsPath: path.resolve(__dirname, './index.ts'),
      activities,
    });

    return worker.runUntil(async () =>
      client.workflow.execute(championSyncWorkflow, {
        taskQueue: 'test-champion-sync',
        workflowId: `test-champion-sync-${Date.now()}-${Math.random()}`,
        args: [],
      })
    );
  }

  it('returns skipped when Champion is not configured', async () => {
    const result = await runWorkflow({
      checkChampionConfigured: async () => false,
      syncElectricityBillCosts: async () => 0,
      logChampionSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'Champion Energy not configured',
    });
  });

  it('runs full sync successfully', async () => {
    const result = await runWorkflow({
      checkChampionConfigured: async () => true,
      syncElectricityBillCosts: async () => 3,
      logChampionSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 3,
    });
  });

  it('logs and returns error when an activity fails', async () => {
    const result = await runWorkflow({
      checkChampionConfigured: async () => true,
      syncElectricityBillCosts: async () => {
        throw new Error('portal unavailable');
      },
      logChampionSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.error,
      recordsCount: 0,
      error: 'portal unavailable',
    });
  });
});
