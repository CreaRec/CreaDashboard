import { SmtSyncStatus, UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import { createPortalClient } from './portalClient';
import { canRunOdrSync, markOdrSync } from './odrRateLimit';
import { estimateCost } from './transform';
import { getSmtConfig, isSmtConfigured } from './types';

const log = createLogger('smt-sync');
let syncInProgress = false;

function yesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

export async function runSmtSync(forceOdr = false): Promise<{
  status: SmtSyncStatus;
  recordsCount: number;
  error?: string;
}> {
  const config = getSmtConfig();
  if (!config) {
    log.debug('SMT sync skipped: not configured');
    return { status: SmtSyncStatus.skipped, recordsCount: 0, error: 'SMT not configured' };
  }

  if (syncInProgress) {
    log.debug('SMT sync skipped: already in progress');
    return { status: SmtSyncStatus.skipped, recordsCount: 0, error: 'Sync already in progress' };
  }

  syncInProgress = true;
  let recordsCount = 0;
  log.debug('SMT sync started', { forceOdr });

  try {
    const client = createPortalClient(config);
    const meter = await client.resolveMeter();
    log.debug('Meter resolved', { esiid: meter.esiid, meterNumber: meter.meterNumber || null });

    const monthlyReadings = await client.fetchMonthly(meter.esiid);
    log.debug('Monthly readings fetched', { count: monthlyReadings.length });
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

    const intervalDate = yesterday();
    const intervals = await client.fetchIntervals(meter.esiid, intervalDate, intervalDate);
    log.debug('Interval readings fetched', {
      count: intervals.length,
      date: intervalDate.toISOString().slice(0, 10),
    });
    for (const interval of intervals) {
      await prisma.electricityIntervalReading.upsert({
        where: {
          esiid_timestamp: {
            esiid: meter.esiid,
            timestamp: interval.timestamp,
          },
        },
        update: {
          kwh: interval.kwh,
        },
        create: {
          esiid: meter.esiid,
          timestamp: interval.timestamp,
          kwh: interval.kwh,
        },
      });
      recordsCount += 1;
    }

    if (forceOdr || canRunOdrSync()) {
      log.debug('Running on-demand meter read', { forceOdr });
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
      markOdrSync();
      recordsCount += 1;
      log.debug('On-demand meter read stored', {
        readingKwh: current.readingKwh,
        readAt: current.readAt.toISOString(),
      });
    } else {
      log.debug('On-demand meter read skipped: rate limited');
    }

    await prisma.smtSyncLog.create({
      data: {
        status: SmtSyncStatus.success,
        recordsCount,
      },
    });

    log.info('SMT sync completed', { recordsCount });
    return { status: SmtSyncStatus.success, recordsCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    log.error('SMT sync failed', { recordsCount, error: message });

    await prisma.smtSyncLog.create({
      data: {
        status: SmtSyncStatus.error,
        recordsCount,
        error: message,
      },
    });

    return { status: SmtSyncStatus.error, recordsCount, error: message };
  } finally {
    syncInProgress = false;
  }
}

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

export function startSmtSyncScheduler(): void {
  const config = getSmtConfig();
  if (!config) {
    log.debug('SMT sync scheduler not started: not configured');
    return;
  }

  const intervalMs = Math.max(config.syncIntervalMinutes, 1) * 60 * 1000;
  log.info('SMT sync scheduler started', { intervalMinutes: config.syncIntervalMinutes });

  void runSmtSync();

  setInterval(() => {
    log.debug('SMT sync scheduler tick');
    void runSmtSync();
  }, intervalMs);
}
