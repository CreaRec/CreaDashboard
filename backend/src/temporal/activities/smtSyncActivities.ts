import { SmtSyncStatus, UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { createPortalClient } from '../../services/smartMeterTexas/portalClient';
import { canRunOdrSync } from '../../services/smartMeterTexas/odrRateLimit';
import { estimateCost } from '../../services/smartMeterTexas/transform';
import {
  getSmtConfig,
  isSmtConfigured,
  type SmtMeter,
} from '../../services/smartMeterTexas/types';

const log = createLogger('smt-activities');

function yesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

function requireSmtConfig() {
  const config = getSmtConfig();
  if (!config) {
    throw new Error('SMT not configured');
  }
  return config;
}

export async function checkSmtConfigured(): Promise<boolean> {
  return isSmtConfigured();
}

export async function resolveMeter(): Promise<SmtMeter> {
  const config = requireSmtConfig();
  const client = createPortalClient(config);
  const meter = await client.resolveMeter();
  log.debug('Meter resolved', { esiid: meter.esiid, meterNumber: meter.meterNumber || null });
  return meter;
}

export async function syncMonthlyReadings(esiid: string): Promise<number> {
  const config = requireSmtConfig();
  const client = createPortalClient(config);
  const monthlyReadings = await client.fetchMonthly(esiid);
  log.debug('Monthly readings fetched', { count: monthlyReadings.length });

  let recordsCount = 0;
  for (const reading of monthlyReadings) {
    await prisma.utilityReading.upsert({
      where: {
        utilityType_month: {
          utilityType: UtilityType.electricity,
          month: reading.month,
        },
      },
      update: {
        consumption: reading.consumption,
        cost: estimateCost(reading.consumption, config.electricityRatePerKwh),
      },
      create: {
        utilityType: UtilityType.electricity,
        month: reading.month,
        consumption: reading.consumption,
        cost: estimateCost(reading.consumption, config.electricityRatePerKwh),
      },
    });
    recordsCount += 1;
  }

  return recordsCount;
}

export async function syncIntervalReadings(esiid: string): Promise<number> {
  const config = requireSmtConfig();
  const client = createPortalClient(config);
  const intervalDate = yesterday();
  const intervals = await client.fetchIntervals(esiid, intervalDate, intervalDate);
  log.debug('Interval readings fetched', {
    count: intervals.length,
    date: intervalDate.toISOString().slice(0, 10),
  });

  let recordsCount = 0;
  for (const interval of intervals) {
    await prisma.electricityIntervalReading.upsert({
      where: {
        esiid_timestamp: {
          esiid,
          timestamp: interval.timestamp,
        },
      },
      update: {
        kwh: interval.kwh,
      },
      create: {
        esiid,
        timestamp: interval.timestamp,
        kwh: interval.kwh,
      },
    });
    recordsCount += 1;
  }

  return recordsCount;
}

export async function shouldRunOdr(esiid: string, forceOdr: boolean): Promise<boolean> {
  if (forceOdr) {
    log.debug('ODR sync forced');
    return true;
  }

  const allowed = await canRunOdrSync(esiid);
  if (!allowed) {
    log.debug('On-demand meter read skipped: rate limited', { esiid });
  }
  return allowed;
}

export async function syncOnDemandReading(meter: SmtMeter): Promise<number> {
  const config = requireSmtConfig();
  const client = createPortalClient(config);
  log.debug('Running on-demand meter read', { esiid: meter.esiid });

  const current = await client.fetchCurrentReading(meter);
  await prisma.electricityMeterSnapshot.upsert({
    where: { esiid: meter.esiid },
    update: {
      readingKwh: current.readingKwh,
      readAt: current.readAt,
    },
    create: {
      esiid: meter.esiid,
      readingKwh: current.readingKwh,
      readAt: current.readAt,
    },
  });

  log.debug('On-demand meter read stored', {
    readingKwh: current.readingKwh,
    readAt: current.readAt.toISOString(),
  });
  return 1;
}

export async function logSyncResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await prisma.smtSyncLog.create({
    data: {
      status,
      recordsCount,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('SMT sync completed', { recordsCount });
  } else if (status === SmtSyncStatus.error) {
    log.error('SMT sync failed', { recordsCount, error });
  }
}
