import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { SmtSyncStatus } from '@prisma/client';
import type * as activities from '../activities/smtSyncActivities';

function getErrorMessage(error: unknown): string {
  if (error instanceof ActivityFailure && error.cause instanceof Error) {
    return error.cause.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown sync error';
}

const {
  checkSmtConfigured,
  resolveMeter,
  syncMonthlyReadings,
  syncIntervalReadings,
  shouldRunOdr,
  logSyncResult,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

const { syncOnDemandReading } = proxyActivities<typeof activities>({
  startToCloseTimeout: '90 seconds',
  retry: {
    maximumAttempts: 2,
    backoffCoefficient: 2,
    initialInterval: '10 seconds',
  },
});

export interface SmtSyncWorkflowInput {
  forceOdr?: boolean;
}

export interface SmtSyncWorkflowResult {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}

export async function smtSyncWorkflow(
  input: SmtSyncWorkflowInput = {}
): Promise<SmtSyncWorkflowResult> {
  const configured = await checkSmtConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'SMT not configured',
    };
  }

  let recordsCount = 0;

  try {
    const meter = await resolveMeter();
    recordsCount += await syncMonthlyReadings(meter.esiid);
    recordsCount += await syncIntervalReadings(meter.esiid);

    const runOdr = await shouldRunOdr(meter.esiid, input.forceOdr === true);
    if (runOdr) {
      recordsCount += await syncOnDemandReading(meter);
    }

    await logSyncResult(SmtSyncStatus.success, recordsCount);
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = getErrorMessage(error);
    await logSyncResult(SmtSyncStatus.error, recordsCount, message);
    return { status: SmtSyncStatus.error, recordsCount, error: message };
  }
}
