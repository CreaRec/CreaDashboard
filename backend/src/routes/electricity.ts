import { Router } from 'express';
import { UtilityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import {
  formatLocalDate,
  parseLocalDate,
  todayLocal,
  yesterdayLocal,
} from '../lib/timezone';
import { endOfDay, formatUtilityMonth, startOfDay } from '../services/smartMeterTexas/transform';
import { getSmtConfig, isSmtConfigured } from '../services/smartMeterTexas/types';
import { isChampionConfigured } from '../services/championEnergy/types';

const router = Router();
const log = createLogger('electricity');

router.get('/monthly', async (_req, res) => {
  log.debug('GET /monthly');
  try {
    const config = getSmtConfig();
    const readings = await prisma.utilityReading.findMany({
      where: { utilityType: UtilityType.electricity },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];

    log.debug('Monthly readings loaded', { count: readings.length });
    res.json({
      connected: isSmtConfigured(),
      label: 'Электричество',
      unit: 'kWh',
      currency: 'USD',
      currentConsumption: latest?.consumption ?? 0,
      currentCost: latest?.cost ?? 0,
      estimatedCost: isChampionConfigured()
        ? false
        : config?.electricityRatePerKwh !== undefined,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        consumption: reading.consumption,
        cost: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch monthly electricity data', error);
    res.status(500).json({ error: 'Failed to fetch monthly electricity data' });
  }
});

router.get('/intervals', async (req, res) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : null;
  log.debug('GET /intervals', { date: dateParam ?? 'today' });

  try {
    let date: Date;
    if (dateParam) {
      try {
        date = parseLocalDate(dateParam);
      } catch {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        return;
      }
    } else {
      date = todayLocal();
    }

    let readings = await prisma.electricityIntervalReading.findMany({
      where: {
        timestamp: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (!dateParam && readings.length === 0) {
      date = yesterdayLocal();
      readings = await prisma.electricityIntervalReading.findMany({
        where: {
          timestamp: {
            gte: startOfDay(date),
            lte: endOfDay(date),
          },
        },
        orderBy: { timestamp: 'asc' },
      });
    }

    const responseDate = formatLocalDate(date);
    log.debug('Interval readings loaded', { count: readings.length, date: responseDate });
    res.json({
      connected: isSmtConfigured(),
      date: responseDate,
      unit: 'kWh',
      readings: readings.map((reading) => ({
        timestamp: reading.timestamp.toISOString(),
        kwh: reading.kwh,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch interval electricity data', error);
    res.status(500).json({ error: 'Failed to fetch interval electricity data' });
  }
});

router.get('/current', async (_req, res) => {
  log.debug('GET /current');
  try {
    const snapshot = await prisma.electricityMeterSnapshot.findFirst({
      orderBy: { readAt: 'desc' },
    });

    log.debug('Current meter snapshot loaded', {
      esiid: snapshot?.esiid ?? null,
      readingKwh: snapshot?.readingKwh ?? null,
    });
    res.json({
      connected: isSmtConfigured(),
      unit: 'kWh',
      readingKwh: snapshot?.readingKwh ?? null,
      readAt: snapshot?.readAt?.toISOString() ?? null,
      esiid: snapshot?.esiid ?? null,
    });
  } catch (error) {
    log.error('Failed to fetch current electricity reading', error);
    res.status(500).json({ error: 'Failed to fetch current electricity reading' });
  }
});

router.get('/bills', async (_req, res) => {
  log.debug('GET /bills');
  try {
    const readings = await prisma.utilityReading.findMany({
      where: {
        utilityType: UtilityType.electricity,
        cost: { gt: 0 },
      },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];

    log.debug('Electricity bills loaded', { count: readings.length });
    res.json({
      connected: isChampionConfigured(),
      label: 'Электричество (счет)',
      currency: 'USD',
      currentAmount: latest?.cost ?? 0,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        amount: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch electricity bills', error);
    res.status(500).json({ error: 'Failed to fetch electricity bills' });
  }
});

export default router;
