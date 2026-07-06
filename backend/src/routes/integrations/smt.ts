import { Router } from 'express';
import { createLogger } from '../../lib/logger';
import { getSmtStatus, runSmtSync } from '../../services/smartMeterTexas/sync';

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
    const result = await runSmtSync(forceOdr);
    log.info('Manual SMT sync finished', { status: result.status, recordsCount: result.recordsCount });
    res.json(result);
  } catch (error) {
    log.error('Failed to sync SMT data', error);
    res.status(500).json({ error: 'Failed to sync SMT data' });
  }
});

export default router;
