import { Router } from 'express';
import { createLogger } from '../lib/logger';
import { getRestrictionsStatus } from '../services/restrictions/sync';

const router = Router();
const log = createLogger('restrictions');

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    const status = await getRestrictionsStatus();
    log.debug('Restrictions loaded', {
      burnBanActive: status.burnBan.active,
      waterStageLabel: status.water.stageLabel,
    });
    res.json(status);
  } catch (error) {
    log.error('Failed to fetch restrictions', error);
    res.status(500).json({ error: 'Failed to fetch restrictions' });
  }
});

export default router;
