import { SmtSyncStatus } from '@prisma/client';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import {
  isRestrictionsSyncConfigured,
  logRestrictionsSyncResult,
  syncRestrictions,
} from '../../services/restrictions/sync';

export async function checkRestrictionsConfigured(): Promise<boolean> {
  return isRestrictionsSyncConfigured();
}

export async function runRestrictionsSync(): Promise<void> {
  await syncRestrictions();
  broadcastDashboardUpdate();
}

export async function logRestrictionsSyncActivityResult(
  status: SmtSyncStatus,
  error?: string
): Promise<void> {
  await logRestrictionsSyncResult(status, error);
}
