import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { dueDate: 'asc' },
    });

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
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

export default router;
