import { Router } from 'express';
import { UtilityType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

const utilityMeta: Record<
  UtilityType,
  { label: string; unit: string }
> = {
  electricity: { label: 'Электричество', unit: 'кВт·ч' },
  water: { label: 'Вода', unit: 'м³' },
  gas: { label: 'Газ', unit: 'м³' },
};

router.get('/', async (_req, res) => {
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
        currentConsumption: latest?.consumption ?? 0,
        currentCost: latest?.cost ?? 0,
        readings: typeReadings.map((r) => ({
          month: r.month,
          consumption: r.consumption,
          cost: r.cost,
        })),
      };
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch utilities' });
  }
});

export default router;
