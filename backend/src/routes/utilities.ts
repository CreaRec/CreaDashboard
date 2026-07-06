import { Router } from 'express';
import { UtilityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { isSmtConfigured } from '../services/smartMeterTexas/types';
import { formatUtilityMonth } from '../services/smartMeterTexas/transform';

const router = Router();
const log = createLogger('utilities');

const utilityMeta: Record<
  UtilityType,
  { label: string; unit: string; currency: string }
> = {
  electricity: { label: 'Электричество', unit: 'kWh', currency: 'USD' },
  water: { label: 'Вода', unit: 'м³', currency: 'RUB' },
  gas: { label: 'Газ', unit: 'м³', currency: 'RUB' },
};

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    const readings = await prisma.utilityReading.findMany({
      orderBy: [{ utilityType: 'asc' }, { month: 'asc' }],
    });

    const result: Record<
      string,
      {
        type: UtilityType;
        label: string;
        unit: string;
        currency: string;
        connected: boolean;
        currentConsumption: number;
        currentCost: number;
        readings: Array<{ month: string; consumption: number; cost: number }>;
      }
    > = {};

    for (const type of Object.values(UtilityType)) {
      const typeReadings = readings.filter((r) => r.utilityType === type);
      const latest = typeReadings[typeReadings.length - 1];
      const meta = utilityMeta[type];

      result[type] = {
        type,
        label: meta.label,
        unit: meta.unit,
        currency: meta.currency,
        connected: type === UtilityType.electricity ? isSmtConfigured() : false,
        currentConsumption: latest?.consumption ?? 0,
        currentCost: latest?.cost ?? 0,
        readings: typeReadings.map((r) => ({
          month: formatUtilityMonth(r.month),
          consumption: r.consumption,
          cost: r.cost,
        })),
      };
    }

    log.debug('Utilities loaded', { readingCount: readings.length });
    res.json(result);
  } catch (error) {
    log.error('Failed to fetch utilities', error);
    res.status(500).json({ error: 'Failed to fetch utilities' });
  }
});

export default router;
