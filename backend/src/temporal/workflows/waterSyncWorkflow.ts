import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { SmtSyncStatus } from '@prisma/client';
import type * as activities from '../activities/waterSyncActivities';

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
  checkWaterSmartConfigured,
  resolveWaterAccount,
  syncWaterReadings,
  logWaterSyncResult,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

export interface WaterSyncWorkflowResult {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}

export async function waterSyncWorkflow(): Promise<WaterSyncWorkflowResult> {
  const configured = await checkWaterSmartConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'WaterSmart not configured',
    };
  }

  let recordsCount = 0;

  try {
    const account = await resolveWaterAccount();
    recordsCount += await syncWaterReadings(account.accountNumber);

    await logWaterSyncResult(SmtSyncStatus.success, recordsCount);
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = getErrorMessage(error);
    await logWaterSyncResult(SmtSyncStatus.error, recordsCount, message);
    return { status: SmtSyncStatus.error, recordsCount, error: message };
  }
}
