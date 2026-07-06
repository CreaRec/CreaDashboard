import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtSyncStatus } from '@prisma/client';
import express from 'express';
import request from 'supertest';

vi.mock('../../temporal/client', () => ({
  getTemporalClient: vi.fn(),
}));

import { getTemporalClient } from '../../temporal/client';
import championRouter from './champion';
import { CHAMPION_SYNC_WORKFLOW, TEMPORAL_TASK_QUEUE } from '../../temporal/config';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/integrations/champion', championRouter);
  return app;
}

describe('POST /api/integrations/champion/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes Temporal workflow and returns result', async () => {
    const execute = vi.fn().mockResolvedValue({
      status: SmtSyncStatus.success,
      recordsCount: 3,
    });

    vi.mocked(getTemporalClient).mockResolvedValue({
      workflow: { execute },
    } as never);

    const response = await request(createApp())
      .post('/api/integrations/champion/sync')
      .send({})
      .expect(200);

    expect(execute).toHaveBeenCalledWith(
      CHAMPION_SYNC_WORKFLOW,
      expect.objectContaining({
        taskQueue: TEMPORAL_TASK_QUEUE,
        args: [],
      })
    );
    expect(response.body).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 3,
    });
  });

  it('returns 503 when Temporal is unavailable', async () => {
    vi.mocked(getTemporalClient).mockRejectedValue(new Error('connection refused'));

    const response = await request(createApp())
      .post('/api/integrations/champion/sync')
      .send({})
      .expect(503);

    expect(response.body).toEqual({
      error: 'Temporal is unavailable or sync failed to start',
    });
  });
});
