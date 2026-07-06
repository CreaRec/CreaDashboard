import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtSyncStatus } from '@prisma/client';
import express from 'express';
import request from 'supertest';

vi.mock('../../temporal/client', () => ({
  getTemporalClient: vi.fn(),
}));

import { getTemporalClient } from '../../temporal/client';
import smtRouter from './smt';
import { SMT_SYNC_WORKFLOW, TEMPORAL_TASK_QUEUE } from '../../temporal/config';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/integrations/smt', smtRouter);
  return app;
}

describe('POST /api/integrations/smt/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes Temporal workflow and returns result', async () => {
    const execute = vi.fn().mockResolvedValue({
      status: SmtSyncStatus.success,
      recordsCount: 42,
    });

    vi.mocked(getTemporalClient).mockResolvedValue({
      workflow: { execute },
    } as never);

    const response = await request(createApp())
      .post('/api/integrations/smt/sync')
      .send({ forceOdr: true })
      .expect(200);

    expect(execute).toHaveBeenCalledWith(
      SMT_SYNC_WORKFLOW,
      expect.objectContaining({
        taskQueue: TEMPORAL_TASK_QUEUE,
        args: [{ forceOdr: true }],
      })
    );
    expect(response.body).toEqual({
      status: SmtSyncStatus.success,
      recordsCount: 42,
    });
  });

  it('returns 503 when Temporal is unavailable', async () => {
    vi.mocked(getTemporalClient).mockRejectedValue(new Error('connection refused'));

    const response = await request(createApp())
      .post('/api/integrations/smt/sync')
      .send({})
      .expect(503);

    expect(response.body).toEqual({
      error: 'Temporal is unavailable or sync failed to start',
    });
  });
});
