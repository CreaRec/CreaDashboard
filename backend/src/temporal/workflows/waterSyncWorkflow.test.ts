import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { SmtSyncStatus } from '@prisma/client';
import { waterSyncWorkflow } from './waterSyncWorkflow';

describe('waterSyncWorkflow', () => {
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
      taskQueue: 'test-water-sync',
      workflowsPath: path.resolve(__dirname, './index.ts'),
      activities,
    });

    return worker.runUntil(async () =>
      client.workflow.execute(waterSyncWorkflow, {
        taskQueue: 'test-water-sync',
        workflowId: `test-water-sync-${Date.now()}-${Math.random()}`,
        args: [],
      })
    );
  }

  it('returns skipped when WaterSmart is not configured', async () => {
    const result = await runWorkflow({
      checkWaterSmartConfigured: async () => false,
      resolveWaterAccount: async () => ({ accountNumber: '1353310-153414' }),
      syncWaterReadings: async () => 0,
      logWaterSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'WaterSmart not configured',
    });
  });

  it('runs full sync successfully', async () => {
    const result = await runWorkflow({
      checkWaterSmartConfigured: async () => true,
      resolveWaterAccount: async () => ({ accountNumber: '1353310-153414' }),
      syncWaterReadings: async () => 91,
      logWaterSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 91,
    });
  });

  it('logs and returns error when an activity fails', async () => {
    const result = await runWorkflow({
      checkWaterSmartConfigured: async () => true,
      resolveWaterAccount: async () => {
        throw new Error('portal unavailable');
      },
      syncWaterReadings: async () => 0,
      logWaterSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.error,
      recordsCount: 0,
      error: 'portal unavailable',
    });
  });
});
