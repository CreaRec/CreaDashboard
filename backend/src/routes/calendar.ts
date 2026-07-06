import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { start: 'asc' },
    });

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
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;
