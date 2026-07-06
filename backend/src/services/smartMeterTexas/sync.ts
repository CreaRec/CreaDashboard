import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { isSmtConfigured } from './types';

export async function getSmtStatus() {
  const configured = isSmtConfigured();
  const lastLog = await prisma.smtSyncLog.findFirst({
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

export type SmtSyncResult = {
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
};
