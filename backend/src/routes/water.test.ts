import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UtilityType } from '@prisma/client';
import express from 'express';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    utilityReading: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../services/waterSmart/types', () => ({
  isWaterSmartConfigured: vi.fn().mockReturnValue(false),
  getWaterSmartConfig: vi.fn().mockReturnValue(undefined),
}));

import { prisma } from '../lib/prisma';
import waterRouter from './water';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/water', waterRouter);
  return app;
}

describe('GET /api/water/bills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns billed amounts for months with cost', async () => {
    vi.mocked(prisma.utilityReading.findMany).mockResolvedValue([
      {
        id: '1',
        utilityType: UtilityType.water,
        month: new Date('2026-04-01T00:00:00.000Z'),
        consumption: 8409.2,
        cost: 209.43,
      },
      {
        id: '2',
        utilityType: UtilityType.water,
        month: new Date('2026-05-01T00:00:00.000Z'),
        consumption: 6099.6,
        cost: 235.43,
      },
      {
        id: '3',
        utilityType: UtilityType.water,
        month: new Date('2026-06-01T00:00:00.000Z'),
        consumption: 18672.3,
        cost: 216.29,
      },
    ]);

    const response = await request(createApp()).get('/api/water/bills').expect(200);

    expect(prisma.utilityReading.findMany).toHaveBeenCalledWith({
      where: {
        utilityType: UtilityType.water,
        cost: { gt: 0 },
      },
      orderBy: { month: 'asc' },
    });
    expect(response.body).toEqual({
      connected: false,
      label: 'Вода (счет)',
      currency: 'USD',
      currentAmount: 216.29,
      readings: [
        { month: '2026-04-01', amount: 209.43 },
        { month: '2026-05-01', amount: 235.43 },
        { month: '2026-06-01', amount: 216.29 },
      ],
    });
  });

  it('returns empty readings when no bills exist', async () => {
    vi.mocked(prisma.utilityReading.findMany).mockResolvedValue([]);

    const response = await request(createApp()).get('/api/water/bills').expect(200);

    expect(response.body.currentAmount).toBe(0);
    expect(response.body.readings).toEqual([]);
  });
});
