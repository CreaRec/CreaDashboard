import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { SmtSyncStatus } from '@prisma/client';
import type * as activities from '../activities/restrictionsSyncActivities';

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
  checkRestrictionsConfigured,
  runRestrictionsSync,
  logRestrictionsSyncActivityResult,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

export interface RestrictionsSyncWorkflowResult {
  status: SmtSyncStatus;
  error?: string;
}

export async function restrictionsSyncWorkflow(): Promise<RestrictionsSyncWorkflowResult> {
  const configured = await checkRestrictionsConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      error: 'Restrictions sync not configured',
    };
  }

  try {
    await runRestrictionsSync();
    await logRestrictionsSyncActivityResult(SmtSyncStatus.success);
    return { status: SmtSyncStatus.success };
  } catch (error) {
    const message = getErrorMessage(error);
    await logRestrictionsSyncActivityResult(SmtSyncStatus.error, message);
    return { status: SmtSyncStatus.error, error: message };
  }
}
