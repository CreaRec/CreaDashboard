import { Router } from 'express';
import { SmtSyncStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { getAtmosStatus } from '../../services/atmosEnergy/sync';
import { getTemporalClient } from '../../temporal/client';
import { ATMOS_SYNC_WORKFLOW, TEMPORAL_TASK_QUEUE } from '../../temporal/config';

const router = Router();
const log = createLogger('atmos');

router.get('/status', async (_req, res) => {
  log.debug('GET /status');
  try {
    const status = await getAtmosStatus();
    log.debug('Atmos status loaded', {
      configured: status.configured,
      lastStatus: status.lastStatus,
    });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch Atmos status', error);
    res.status(500).json({ error: 'Failed to fetch Atmos status' });
  }
});

router.post('/sync', async (_req, res) => {
  log.debug('POST /sync');

  try {
    const client = await getTemporalClient();
    const result = await client.workflow.execute(ATMOS_SYNC_WORKFLOW, {
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowId: `atmos-sync-manual-${Date.now()}`,
      args: [],
    });

    log.info('Manual Atmos sync finished', {
      status: result.status,
      recordsCount: result.recordsCount,
    });

    if (result.status === SmtSyncStatus.success) {
      broadcastDashboardUpdate();
    }

    res.json(result);
  } catch (error) {
    log.error('Failed to sync Atmos data', error);
    res.status(503).json({ error: 'Temporal is unavailable or sync failed to start' });
  }
});

export default router;
