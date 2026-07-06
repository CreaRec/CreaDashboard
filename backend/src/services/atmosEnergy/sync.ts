import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { isAtmosConfigured } from './types';

export async function getAtmosStatus() {
  const configured = isAtmosConfigured();
  const lastLog = await prisma.gasSyncLog.findFirst({
    orderBy: { syncedAt: 'desc' },
  });

  return {
    configured,
    lastSync: lastLog?.syncedAt ?? null,
    lastStatus: lastLog?.status ?? null,
    lastError: lastLog?.error ?? null,
    recordsCount: lastLog?.recordsCount ?? 0,
  };
}

export type AtmosSyncResult = {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
};
