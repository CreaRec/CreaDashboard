import { Router } from 'express';
import { SmtSyncStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { getChampionStatus } from '../../services/championEnergy/sync';
import { getTemporalClient } from '../../temporal/client';
import { CHAMPION_SYNC_WORKFLOW, TEMPORAL_TASK_QUEUE } from '../../temporal/config';

const router = Router();
const log = createLogger('champion');

router.get('/status', async (_req, res) => {
  log.debug('GET /status');
  try {
    const status = await getChampionStatus();
    log.debug('Champion status loaded', {
      configured: status.configured,
      lastStatus: status.lastStatus,
    });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch Champion status', error);
    res.status(500).json({ error: 'Failed to fetch Champion status' });
  }
});

router.post('/sync', async (_req, res) => {
  log.debug('POST /sync');

  try {
    const client = await getTemporalClient();
    const result = await client.workflow.execute(CHAMPION_SYNC_WORKFLOW, {
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowId: `champion-sync-manual-${Date.now()}`,
      args: [],
    });

    log.info('Manual Champion sync finished', {
      status: result.status,
      recordsCount: result.recordsCount,
    });

    if (result.status === SmtSyncStatus.success) {
      broadcastDashboardUpdate();
    }

    res.json(result);
  } catch (error) {
    log.error('Failed to sync Champion data', error);
    res.status(503).json({ error: 'Temporal is unavailable or sync failed to start' });
  }
});

export default router;
