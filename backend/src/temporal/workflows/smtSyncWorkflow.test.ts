import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { SmtSyncStatus } from '@prisma/client';
import { smtSyncWorkflow } from './smtSyncWorkflow';
import type { SmtMeter } from '../../services/smartMeterTexas/types';

const meter: SmtMeter = {
  esiid: '123456789012345678',
  meterNumber: 'MTR-1',
  address: '123 Main St',
};

describe('smtSyncWorkflow', () => {
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
      taskQueue: 'test-smt-sync',
      workflowsPath: path.resolve(__dirname, './index.ts'),
      activities,
    });

    return worker.runUntil(async () =>
      client.workflow.execute(smtSyncWorkflow, {
        taskQueue: 'test-smt-sync',
        workflowId: `test-smt-sync-${Date.now()}-${Math.random()}`,
        args: [{}],
      })
    );
  }

  it('returns skipped when SMT is not configured', async () => {
    const result = await runWorkflow({
      checkSmtConfigured: async () => false,
      resolveMeter: async () => meter,
      syncMonthlyReadings: async () => 0,
      syncIntervalReadings: async () => 0,
      shouldRunOdr: async () => false,
      syncOnDemandReading: async () => 0,
      logSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'SMT not configured',
    });
  });

  it('runs full sync without ODR when rate limited', async () => {
    const result = await runWorkflow({
      checkSmtConfigured: async () => true,
      resolveMeter: async () => meter,
      syncMonthlyReadings: async () => 12,
      syncIntervalReadings: async () => 96,
      shouldRunOdr: async () => false,
      syncOnDemandReading: async () => 1,
      logSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 108,
    });
  });

  it('includes ODR when allowed', async () => {
    const result = await runWorkflow({
      checkSmtConfigured: async () => true,
      resolveMeter: async () => meter,
      syncMonthlyReadings: async () => 2,
      syncIntervalReadings: async () => 4,
      shouldRunOdr: async () => true,
      syncOnDemandReading: async () => 1,
      logSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 7,
    });
  });

  it('logs and returns error when an activity fails', async () => {
    const result = await runWorkflow({
      checkSmtConfigured: async () => true,
      resolveMeter: async () => {
        throw new Error('portal unavailable');
      },
      syncMonthlyReadings: async () => 0,
      syncIntervalReadings: async () => 0,
      shouldRunOdr: async () => false,
      syncOnDemandReading: async () => 0,
      logSyncResult: async () => undefined,
    });

    expect(result).toEqual({
      status: SmtSyncStatus.error,
      recordsCount: 0,
      error: 'portal unavailable',
    });
  });
});
