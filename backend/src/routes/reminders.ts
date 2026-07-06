import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

const router = Router();
const log = createLogger('reminders');

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { dueDate: 'asc' },
    });

    log.debug('Reminders loaded', { count: reminders.length });
    res.json(
      reminders.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        dueDate: reminder.dueDate.toISOString().slice(0, 10),
        priority: reminder.priority,
        completed: reminder.completed,
      }))
    );
  } catch (error) {
    log.error('Failed to fetch reminders', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

export default router;
