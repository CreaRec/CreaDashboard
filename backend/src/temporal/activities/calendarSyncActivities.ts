import { SmtSyncStatus } from '@prisma/client';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { isAppleCalendarConfigured } from '../../services/appleCalendar/types';
import {
  logCalendarSyncResult,
  syncCalendarEvents,
} from '../../services/appleCalendar/sync';

export async function checkAppleCalendarConfigured(): Promise<boolean> {
  return isAppleCalendarConfigured();
}

export async function runCalendarSync(): Promise<number> {
  const recordsCount = await syncCalendarEvents();
  broadcastDashboardUpdate();
  return recordsCount;
}

export async function logCalendarSyncActivityResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await logCalendarSyncResult(status, recordsCount, error);
}
