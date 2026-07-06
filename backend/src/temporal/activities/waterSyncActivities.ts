import { SmtSyncStatus, UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { formatLocalDate } from '../../lib/timezone';
import { createPortalClient } from '../../services/waterSmart/portalClient';
import { aggregateMonthlyFromDaily } from '../../services/waterSmart/transform';
import {
  getWaterSmartConfig,
  isWaterSmartConfigured,
  type WaterSmartAccount,
} from '../../services/waterSmart/types';

const log = createLogger('water-activities');

const DAILY_RETENTION_DAYS = 90;

function requireWaterSmartConfig() {
  const config = getWaterSmartConfig();
  if (!config) {
    throw new Error('WaterSmart not configured');
  }
  return config;
}

export async function checkWaterSmartConfigured(): Promise<boolean> {
  return isWaterSmartConfigured();
}

export async function resolveWaterAccount(): Promise<WaterSmartAccount> {
  const config = requireWaterSmartConfig();
  const client = createPortalClient(config);
  const account = await client.resolveAccount();
  log.debug('WaterSmart account resolved', { accountNumber: account.accountNumber });
  return account;
}

export async function syncWaterReadings(accountNumber: string): Promise<number> {
  const config = requireWaterSmartConfig();
  const client = createPortalClient(config);
  const snapshot = await client.fetchUsageSnapshot();

  const monthlyReadings = aggregateMonthlyFromDaily(
    snapshot.dailyReadings,
    snapshot.billingEntries,
    config.waterRatePerGallon
  );

  let recordsCount = 0;

  for (const reading of monthlyReadings) {
    await prisma.utilityReading.upsert({
      where: {
        utilityType_month: {
          utilityType: UtilityType.water,
          month: reading.month,
        },
      },
      update: {
        consumption: reading.consumption,
        cost: reading.cost,
      },
      create: {
        utilityType: UtilityType.water,
        month: reading.month,
        consumption: reading.consumption,
        cost: reading.cost,
      },
    });
    recordsCount += 1;
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DAILY_RETENTION_DAYS);

  for (const reading of snapshot.dailyReadings) {
    if (reading.date < cutoff) {
      continue;
    }

    await prisma.waterDailyReading.upsert({
      where: {
        accountNumber_date: {
          accountNumber,
          date: reading.date,
        },
      },
      update: {
        gallons: reading.gallons,
      },
      create: {
        accountNumber,
        date: reading.date,
        gallons: reading.gallons,
      },
    });
    recordsCount += 1;
  }

  log.debug('WaterSmart readings stored', {
    accountNumber,
    monthlyCount: monthlyReadings.length,
    recordsCount,
    latestDate: snapshot.dailyReadings.at(-1)
      ? formatLocalDate(snapshot.dailyReadings.at(-1)!.date)
      : null,
  });

  return recordsCount;
}

export async function logWaterSyncResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await prisma.waterSyncLog.create({
    data: {
      status,
      recordsCount,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('WaterSmart sync completed', { recordsCount });
  } else if (status === SmtSyncStatus.error) {
    log.error('WaterSmart sync failed', { recordsCount, error });
  }
}
