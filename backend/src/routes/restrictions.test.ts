import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/restrictions/sync', () => ({
  getRestrictionsStatus: vi.fn(),
}));

import { getRestrictionsStatus } from '../services/restrictions/sync';
import restrictionsRouter from './restrictions';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/restrictions', restrictionsRouter);
  return app;
}

describe('GET /api/restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns restrictions snapshot', async () => {
    vi.mocked(getRestrictionsStatus).mockResolvedValue({
      burnBan: {
        active: false,
        county: 'Travis',
        label: 'Нет запрета',
      },
      water: {
        stageLabel: 'Modified Stage 1',
      },
      fetchedAt: '2026-07-05T12:00:00.000Z',
    });

    const response = await request(createApp()).get('/api/restrictions').expect(200);

    expect(response.body).toEqual({
      burnBan: {
        active: false,
        county: 'Travis',
        label: 'Нет запрета',
      },
      water: {
        stageLabel: 'Modified Stage 1',
      },
      fetchedAt: '2026-07-05T12:00:00.000Z',
    });
  });
});
