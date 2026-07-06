import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

const router = Router();
const log = createLogger('notes');

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    const notes = await prisma.note.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    log.debug('Notes loaded', { count: notes.length });
    res.json(
      notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        updatedAt: note.updatedAt.toISOString().slice(0, 10),
      }))
    );
  } catch (error) {
    log.error('Failed to fetch notes', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

export default router;
