import { Router } from 'express';
import { UtilityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import {
  formatLocalDate,
  getLocalDateParts,
  parseLocalDate,
  todayLocal,
} from '../lib/timezone';
import { formatUtilityMonth } from '../services/smartMeterTexas/transform';
import { getWaterSmartStatus } from '../services/waterSmart/sync';
import {
  getWaterSmartConfig,
  isWaterSmartConfigured,
} from '../services/waterSmart/types';

const router = Router();
const log = createLogger('water');

function startOfMonth(date: Date): Date {
  const parts = getLocalDateParts(date);
  return parseLocalDate(`${parts.year}-${String(parts.month).padStart(2, '0')}-01`);
}

function endOfMonth(date: Date): Date {
  const parts = getLocalDateParts(date);
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  return parseLocalDate(
    `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  );
}

router.get('/monthly', async (_req, res) => {
  log.debug('GET /monthly');
  try {
    const config = getWaterSmartConfig();
    const readings = await prisma.utilityReading.findMany({
      where: { utilityType: UtilityType.water },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];
    const waterStatus = await getWaterSmartStatus();

    log.debug('Water monthly readings loaded', { count: readings.length });
    res.json({
      connected: isWaterSmartConfigured(),
      syncStatus: waterStatus.lastStatus,
      syncError: waterStatus.lastError,
      label: 'Вода',
      unit: 'gal',
      currency: 'USD',
      currentConsumption: latest?.consumption ?? 0,
      currentCost: latest?.cost ?? 0,
      estimatedCost: config?.waterRatePerGallon !== undefined,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        consumption: reading.consumption,
        cost: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch monthly water data', error);
    res.status(500).json({ error: 'Failed to fetch monthly water data' });
  }
});

router.get('/bills', async (_req, res) => {
  log.debug('GET /bills');
  try {
    const readings = await prisma.utilityReading.findMany({
      where: {
        utilityType: UtilityType.water,
        cost: { gt: 0 },
      },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];
    const waterStatus = await getWaterSmartStatus();

    log.debug('Water bills loaded', { count: readings.length });
    res.json({
      connected: isWaterSmartConfigured(),
      syncStatus: waterStatus.lastStatus,
      syncError: waterStatus.lastError,
      label: 'Вода (счет)',
      currency: 'USD',
      currentAmount: latest?.cost ?? 0,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        amount: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch water bills', error);
    res.status(500).json({ error: 'Failed to fetch water bills' });
  }
});

router.get('/daily', async (req, res) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : null;
  log.debug('GET /daily', { date: dateParam ?? 'current-month' });

  try {
    let anchorDate: Date;
    if (dateParam) {
      try {
        anchorDate = parseLocalDate(dateParam);
      } catch {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        return;
      }
    } else {
      anchorDate = todayLocal();
    }

    const readings = await prisma.waterDailyReading.findMany({
      where: {
        date: {
          gte: startOfMonth(anchorDate),
          lte: endOfMonth(anchorDate),
        },
      },
      orderBy: { date: 'asc' },
    });

    const monthLabel = formatLocalDate(startOfMonth(anchorDate)).slice(0, 7);
    const waterStatus = await getWaterSmartStatus();
    log.debug('Water daily readings loaded', { count: readings.length, month: monthLabel });
    res.json({
      connected: isWaterSmartConfigured(),
      syncStatus: waterStatus.lastStatus,
      syncError: waterStatus.lastError,
      month: monthLabel,
      unit: 'gal',
      readings: readings.map((reading) => ({
        date: formatLocalDate(reading.date),
        gallons: reading.gallons,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch daily water data', error);
    res.status(500).json({ error: 'Failed to fetch daily water data' });
  }
});

export default router;
