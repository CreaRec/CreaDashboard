import { SmtSyncStatus } from '@prisma/client';
import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/calendarSyncActivities';

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
  checkAppleCalendarConfigured,
  runCalendarSync,
  logCalendarSyncActivityResult,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
    initialInterval: '5 seconds',
  },
});

export interface CalendarSyncWorkflowResult {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}

export async function calendarSyncWorkflow(): Promise<CalendarSyncWorkflowResult> {
  const configured = await checkAppleCalendarConfigured();
  if (!configured) {
    return {
      status: SmtSyncStatus.skipped,
      recordsCount: 0,
      error: 'Apple Calendar not configured',
    };
  }

  let recordsCount = 0;

  try {
    recordsCount = await runCalendarSync();
    await logCalendarSyncActivityResult(SmtSyncStatus.success, recordsCount);
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = getErrorMessage(error);
    await logCalendarSyncActivityResult(SmtSyncStatus.error, recordsCount, message);
    return { status: SmtSyncStatus.error, recordsCount, error: message };
  }
}
