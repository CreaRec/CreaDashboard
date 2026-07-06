import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { isWaterSmartConfigured } from './types';

export async function getWaterSmartStatus() {
  const configured = isWaterSmartConfigured();
  const lastLog = await prisma.waterSyncLog.findFirst({
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

export type WaterSmartSyncResult = {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
};
