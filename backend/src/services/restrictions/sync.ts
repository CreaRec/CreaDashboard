import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { isOpenAiConfigured } from '../../lib/openai/client';
import { fetchBurnBanStatus } from './burnBan';
import { fetchWaterRestrictionsStatus } from './waterRestrictions';
import { getRestrictionsConfig } from './types';

const log = createLogger('restrictions-sync');

const SNAPSHOT_ID = 'current';

export interface RestrictionsApiResponse {
  burnBan: {
    active: boolean;
    county: string;
    label: string;
  };
  water: {
    stageLabel: string;
  };
  fetchedAt: string;
}

const EMPTY_RESPONSE: RestrictionsApiResponse = {
  burnBan: {
    active: false,
    county: 'Travis',
    label: 'Нет запрета',
  },
  water: {
    stageLabel: 'Unknown',
  },
  fetchedAt: new Date(0).toISOString(),
};

export function isRestrictionsSyncConfigured(): boolean {
  return isOpenAiConfigured();
}

export async function getRestrictionsSyncStatus() {
  const configured = isRestrictionsSyncConfigured();
  const lastLog = await prisma.restrictionsSyncLog.findFirst({
    orderBy: { syncedAt: 'desc' },
  });

  return {
    configured,
    lastSync: lastLog?.syncedAt ?? null,
    lastStatus: lastLog?.status ?? null,
    lastError: lastLog?.error ?? null,
  };
}

export async function getRestrictionsStatus(): Promise<RestrictionsApiResponse> {
  const snapshot = await prisma.restrictionsSnapshot.findUnique({
    where: { id: SNAPSHOT_ID },
  });

  if (!snapshot) {
    return EMPTY_RESPONSE;
  }

  return {
    burnBan: {
      active: snapshot.burnBanActive,
      county: snapshot.burnBanCounty,
      label: snapshot.burnBanActive ? 'Запрет действует' : 'Нет запрета',
    },
    water: {
      stageLabel: snapshot.waterStageLabel,
    },
    fetchedAt: snapshot.fetchedAt.toISOString(),
  };
}

export async function syncRestrictions(): Promise<void> {
  const config = getRestrictionsConfig();

  const burnBan = await fetchBurnBanStatus(config.burnBanCounties);
  const water = await fetchWaterRestrictionsStatus(config.waterRestrictionsUrl);

  await prisma.restrictionsSnapshot.upsert({
    where: { id: SNAPSHOT_ID },
    update: {
      burnBanActive: burnBan.active,
      burnBanCounty: burnBan.county,
      waterStage: water.stage,
      waterStageLabel: water.stageLabel,
    },
    create: {
      id: SNAPSHOT_ID,
      burnBanActive: burnBan.active,
      burnBanCounty: burnBan.county,
      waterStage: water.stage,
      waterStageLabel: water.stageLabel,
    },
  });

  log.info('Restrictions snapshot updated', {
    burnBanActive: burnBan.active,
    waterStage: water.stage,
    waterStageLabel: water.stageLabel,
  });
}

export async function logRestrictionsSyncResult(
  status: SmtSyncStatus,
  error?: string
): Promise<void> {
  await prisma.restrictionsSyncLog.create({
    data: {
      status,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('Restrictions sync completed');
  } else if (status === SmtSyncStatus.error) {
    log.error('Restrictions sync failed', { error });
  }
}
