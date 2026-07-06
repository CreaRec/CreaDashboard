import { Router } from 'express';
import { SmtSyncStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { getSmtStatus } from '../../services/smartMeterTexas/sync';
import { getTemporalClient } from '../../temporal/client';
import {
  SMT_SYNC_WORKFLOW,
  TEMPORAL_TASK_QUEUE,
} from '../../temporal/config';

const router = Router();
const log = createLogger('smt');

router.get('/status', async (_req, res) => {
  log.debug('GET /status');
  try {
    const status = await getSmtStatus();
    log.debug('SMT status loaded', { configured: status.configured, lastStatus: status.lastStatus });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch SMT status', error);
    res.status(500).json({ error: 'Failed to fetch SMT status' });
  }
});

router.post('/sync', async (req, res) => {
  const forceOdr = req.body?.forceOdr === true;
  log.debug('POST /sync', { forceOdr });

  try {
    const client = await getTemporalClient();
    const result = await client.workflow.execute(SMT_SYNC_WORKFLOW, {
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowId: `smt-sync-manual-${Date.now()}`,
      args: [{ forceOdr }],
    });

    log.info('Manual SMT sync finished', {
      status: result.status,
      recordsCount: result.recordsCount,
    });

    if (result.status === SmtSyncStatus.success) {
      broadcastDashboardUpdate();
    }

    res.json(result);
  } catch (error) {
    log.error('Failed to sync SMT data', error);
    res.status(503).json({ error: 'Temporal is unavailable or sync failed to start' });
  }
});

export default router;
