import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { SmtSyncStatus } from '@prisma/client';
import type * as activities from '../activities/atmosSyncActivities';

function getErrorMessage(error: unknown): string {
  if (error instanceof ActivityFailure && error.cause instanceof Error) {
    return error.cause.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown sync error';
}

const { checkAtmosConfigured, syncGasReadings, logAtmosSyncResult } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

export interface AtmosSyncWorkflowResult {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}

export async function atmosSyncWorkflow(): Promise<AtmosSyncWorkflowResult> {
  const configured = await checkAtmosConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'Atmos Energy not configured',
    };
  }

  let recordsCount = 0;

  try {
    recordsCount += await syncGasReadings();
    await logAtmosSyncResult(SmtSyncStatus.success, recordsCount);
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = getErrorMessage(error);
    await logAtmosSyncResult(SmtSyncStatus.error, recordsCount, message);
    return { status: SmtSyncStatus.error, recordsCount, error: message };
  }
}
