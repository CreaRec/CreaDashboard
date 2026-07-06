import { Router } from 'express';
import { SmtSyncStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { getRestrictionsSyncStatus } from '../../services/restrictions/sync';
import { getTemporalClient } from '../../temporal/client';
import { RESTRICTIONS_SYNC_WORKFLOW, TEMPORAL_TASK_QUEUE } from '../../temporal/config';

const router = Router();
const log = createLogger('restrictions-integration');

router.get('/status', async (_req, res) => {
  log.debug('GET /status');
  try {
    const status = await getRestrictionsSyncStatus();
    log.debug('Restrictions sync status loaded', {
      configured: status.configured,
      lastStatus: status.lastStatus,
    });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch restrictions sync status', error);
    res.status(500).json({ error: 'Failed to fetch restrictions sync status' });
  }
});

router.post('/sync', async (_req, res) => {
  log.debug('POST /sync');

  try {
    const client = await getTemporalClient();
    const result = await client.workflow.execute(RESTRICTIONS_SYNC_WORKFLOW, {
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowId: `restrictions-sync-manual-${Date.now()}`,
      args: [],
    });

    log.info('Manual restrictions sync finished', {
      status: result.status,
      error: result.error,
    });

    if (result.status === SmtSyncStatus.success) {
      broadcastDashboardUpdate();
    }

    res.json(result);
  } catch (error) {
    log.error('Failed to sync restrictions data', error);
    res.status(503).json({ error: 'Temporal is unavailable or sync failed to start' });
  }
});

export default router;
