import { SmtSyncStatus, UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { createPortalClient } from '../../services/atmosEnergy/portalClient';
import { mergeMonthlyAndBilling } from '../../services/atmosEnergy/transform';
import { getAtmosConfig, isAtmosConfigured } from '../../services/atmosEnergy/types';

const log = createLogger('atmos-activities');

function requireAtmosConfig() {
  const config = getAtmosConfig();
  if (!config) {
    throw new Error('Atmos Energy not configured');
  }
  return config;
}

export async function checkAtmosConfigured(): Promise<boolean> {
  return isAtmosConfigured();
}

export async function syncGasReadings(): Promise<number> {
  const config = requireAtmosConfig();
  const client = createPortalClient(config);
  const snapshot = await client.fetchUsageSnapshot();
  const monthlyReadings = mergeMonthlyAndBilling(
    snapshot.monthlyReadings,
    snapshot.billingEntries,
    config.gasRatePerCcf
  );

  let recordsCount = 0;

  for (const reading of monthlyReadings) {
    await prisma.utilityReading.upsert({
      where: {
        utilityType_month: {
          utilityType: UtilityType.gas,
          month: reading.month,
        },
      },
      update: {
        consumption: reading.consumption,
        cost: reading.cost,
      },
      create: {
        utilityType: UtilityType.gas,
        month: reading.month,
        consumption: reading.consumption,
        cost: reading.cost,
      },
    });
    recordsCount += 1;
  }

  log.debug('Atmos gas readings stored', {
    monthlyCount: monthlyReadings.length,
    recordsCount,
  });

  return recordsCount;
}

export async function logAtmosSyncResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await prisma.gasSyncLog.create({
    data: {
      status,
      recordsCount,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('Atmos sync completed', { recordsCount });
  } else if (status === SmtSyncStatus.error) {
    log.error('Atmos sync failed', { recordsCount, error });
  }
}
