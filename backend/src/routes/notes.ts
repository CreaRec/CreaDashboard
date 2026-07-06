import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { updatedAt: 'desc' },
    });

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
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

export default router;
