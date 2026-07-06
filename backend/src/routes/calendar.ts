import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

const router = Router();
const log = createLogger('calendar');

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { start: 'asc' },
    });

    log.debug('Calendar events loaded', { count: events.length });
    res.json(
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end?.toISOString(),
        source: event.source,
      }))
    );
  } catch (error) {
    log.error('Failed to fetch calendar events', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;
