import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { isChampionConfigured } from './types';

export async function getChampionStatus() {
  const configured = isChampionConfigured();
  const lastLog = await prisma.championSyncLog.findFirst({
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

export type ChampionSyncResult = {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
};
