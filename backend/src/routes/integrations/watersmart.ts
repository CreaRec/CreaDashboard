import { Router } from 'express';
import { SmtSyncStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { getWaterSmartStatus } from '../../services/waterSmart/sync';
import { getTemporalClient } from '../../temporal/client';
import { TEMPORAL_TASK_QUEUE, WATER_SYNC_WORKFLOW } from '../../temporal/config';

const router = Router();
const log = createLogger('watersmart');

router.get('/status', async (_req, res) => {
  log.debug('GET /status');
  try {
    const status = await getWaterSmartStatus();
    log.debug('WaterSmart status loaded', {
      configured: status.configured,
      lastStatus: status.lastStatus,
    });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch WaterSmart status', error);
    res.status(500).json({ error: 'Failed to fetch WaterSmart status' });
  }
});

router.post('/sync', async (_req, res) => {
  log.debug('POST /sync');

  try {
    const client = await getTemporalClient();
    const result = await client.workflow.execute(WATER_SYNC_WORKFLOW, {
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowId: `water-sync-manual-${Date.now()}`,
      args: [],
    });

    log.info('Manual WaterSmart sync finished', {
      status: result.status,
      recordsCount: result.recordsCount,
    });

    if (result.status === SmtSyncStatus.success) {
      broadcastDashboardUpdate();
    }

    res.json(result);
  } catch (error) {
    log.error('Failed to sync WaterSmart data', error);
    res.status(503).json({ error: 'Temporal is unavailable or sync failed to start' });
  }
});

export default router;
