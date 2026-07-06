import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    electricityIntervalReading: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../services/smartMeterTexas/types', () => ({
  isSmtConfigured: vi.fn().mockReturnValue(true),
  getSmtConfig: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/smartMeterTexas/sync', () => ({
  getSmtStatus: vi.fn().mockResolvedValue({
    configured: true,
    lastSync: null,
    lastStatus: 'success',
    lastError: null,
    recordsCount: 0,
  }),
}));

vi.mock('../services/championEnergy/types', () => ({
  isChampionConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../services/championEnergy/sync', () => ({
  getChampionStatus: vi.fn().mockResolvedValue({
    configured: true,
    lastSync: null,
    lastStatus: 'success',
    lastError: null,
    recordsCount: 0,
  }),
}));

import { prisma } from '../lib/prisma';
import { parseLocalDate } from '../lib/timezone';
import { startOfDay } from '../services/smartMeterTexas/transform';
import electricityRouter from './electricity';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/electricity', electricityRouter);
  return app;
}

describe('GET /api/electricity/intervals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to the most recent day with readings when today is empty', async () => {
    vi.mocked(prisma.electricityIntervalReading.findMany).mockImplementation(async ({ where }) => {
      const timestamp = where?.timestamp as { gte?: Date; lte?: Date };
      const dayStart = timestamp?.gte?.toISOString();

      if (dayStart === startOfDay(parseLocalDate('2026-07-06')).toISOString()) {
        return [];
      }

      if (dayStart === startOfDay(parseLocalDate('2026-07-05')).toISOString()) {
        return [];
      }

      if (dayStart === startOfDay(parseLocalDate('2026-07-04')).toISOString()) {
        return [
          {
            id: '1',
            esiid: 'esiid-1',
            timestamp: new Date('2026-07-04T12:00:00.000Z'),
            kwh: 0.42,
          },
        ];
      }

      return [];
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T10:00:00.000Z'));

    const response = await request(createApp()).get('/api/electricity/intervals').expect(200);

    expect(response.body.date).toBe('2026-07-04');
    expect(response.body.readings).toHaveLength(1);
    expect(response.body.readings[0].kwh).toBe(0.42);

    vi.useRealTimers();
  });

  it('returns empty readings for an explicit date without fallback', async () => {
    vi.mocked(prisma.electricityIntervalReading.findMany).mockResolvedValue([]);

    const response = await request(createApp())
      .get('/api/electricity/intervals?date=2026-07-05')
      .expect(200);

    expect(response.body.date).toBe('2026-07-05');
    expect(response.body.readings).toEqual([]);
    expect(prisma.electricityIntervalReading.findMany).toHaveBeenCalledTimes(1);
  });
});
