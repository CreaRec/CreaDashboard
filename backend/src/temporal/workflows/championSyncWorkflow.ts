import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { SmtSyncStatus } from '@prisma/client';
import type * as activities from '../activities/championSyncActivities';

function getErrorMessage(error: unknown): string {
  if (error instanceof ActivityFailure && error.cause instanceof Error) {
    return error.cause.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown sync error';
}

const { checkChampionConfigured, syncElectricityBillCosts, logChampionSyncResult } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '3 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

export interface ChampionSyncWorkflowResult {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}

export async function championSyncWorkflow(): Promise<ChampionSyncWorkflowResult> {
  const configured = await checkChampionConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'Champion Energy not configured',
    };
  }

  let recordsCount = 0;

  try {
    recordsCount += await syncElectricityBillCosts();
    await logChampionSyncResult(SmtSyncStatus.success, recordsCount);
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = getErrorMessage(error);
    await logChampionSyncResult(SmtSyncStatus.error, recordsCount, message);
    return { status: SmtSyncStatus.error, recordsCount, error: message };
  }
}
