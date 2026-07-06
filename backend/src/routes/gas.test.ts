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

vi.mock('../services/atmosEnergy/types', () => ({
  isAtmosConfigured: vi.fn().mockReturnValue(false),
  getAtmosConfig: vi.fn().mockReturnValue(undefined),
}));

import { prisma } from '../lib/prisma';
import gasRouter from './gas';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/gas', gasRouter);
  return app;
}

describe('GET /api/gas/bills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns billed amounts for months with cost', async () => {
    vi.mocked(prisma.utilityReading.findMany).mockResolvedValue([
      {
        id: '1',
        utilityType: UtilityType.gas,
        month: new Date('2026-04-01T00:00:00.000Z'),
        consumption: 42.5,
        cost: 87.42,
      },
      {
        id: '2',
        utilityType: UtilityType.gas,
        month: new Date('2026-05-01T00:00:00.000Z'),
        consumption: 18.2,
        cost: 52.18,
      },
    ]);

    const response = await request(createApp()).get('/api/gas/bills').expect(200);

    expect(prisma.utilityReading.findMany).toHaveBeenCalledWith({
      where: {
        utilityType: UtilityType.gas,
        cost: { gt: 0 },
      },
      orderBy: { month: 'asc' },
    });
    expect(response.body).toEqual({
      connected: false,
      label: 'Газ (счет)',
      currency: 'USD',
      currentAmount: 52.18,
      readings: [
        { month: '2026-04-01', amount: 87.42 },
        { month: '2026-05-01', amount: 52.18 },
      ],
    });
  });
});

describe('GET /api/gas/monthly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns monthly gas consumption readings', async () => {
    vi.mocked(prisma.utilityReading.findMany).mockResolvedValue([
      {
        id: '1',
        utilityType: UtilityType.gas,
        month: new Date('2026-04-01T00:00:00.000Z'),
        consumption: 42.5,
        cost: 87.42,
      },
    ]);

    const response = await request(createApp()).get('/api/gas/monthly').expect(200);

    expect(response.body).toMatchObject({
      connected: false,
      label: 'Газ',
      unit: 'CCF',
      currency: 'USD',
      currentConsumption: 42.5,
      currentCost: 87.42,
    });
  });
});
