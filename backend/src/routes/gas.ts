import { Router } from 'express';
import { UtilityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { formatUtilityMonth } from '../services/smartMeterTexas/transform';
import { getAtmosConfig, isAtmosConfigured } from '../services/atmosEnergy/types';

const router = Router();
const log = createLogger('gas');

router.get('/monthly', async (_req, res) => {
  log.debug('GET /monthly');
  try {
    const config = getAtmosConfig();
    const readings = await prisma.utilityReading.findMany({
      where: { utilityType: UtilityType.gas },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];

    log.debug('Gas monthly readings loaded', { count: readings.length });
    res.json({
      connected: isAtmosConfigured(),
      label: 'Газ',
      unit: 'CCF',
      currency: 'USD',
      currentConsumption: latest?.consumption ?? 0,
      currentCost: latest?.cost ?? 0,
      estimatedCost: config?.gasRatePerCcf !== undefined,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        consumption: reading.consumption,
        cost: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch monthly gas data', error);
    res.status(500).json({ error: 'Failed to fetch monthly gas data' });
  }
});

router.get('/bills', async (_req, res) => {
  log.debug('GET /bills');
  try {
    const readings = await prisma.utilityReading.findMany({
      where: {
        utilityType: UtilityType.gas,
        cost: { gt: 0 },
      },
      orderBy: { month: 'asc' },
    });

    const latest = readings[readings.length - 1];

    log.debug('Gas bills loaded', { count: readings.length });
    res.json({
      connected: isAtmosConfigured(),
      label: 'Газ (счет)',
      currency: 'USD',
      currentAmount: latest?.cost ?? 0,
      readings: readings.map((reading) => ({
        month: formatUtilityMonth(reading.month),
        amount: reading.cost,
      })),
    });
  } catch (error) {
    log.error('Failed to fetch gas bills', error);
    res.status(500).json({ error: 'Failed to fetch gas bills' });
  }
});

export default router;
