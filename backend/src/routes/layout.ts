import { Router } from 'express';
import { WidgetId } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

const ALL_WIDGET_IDS = Object.values(WidgetId);

router.get('/', async (_req, res) => {
  try {
    const layouts = await prisma.widgetLayout.findMany({
      orderBy: { position: 'asc' },
    });

    res.json({
      order: layouts.map((layout) => layout.widgetId),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

router.put('/', async (req, res) => {
  const { order } = req.body as { order?: string[] };

  if (!Array.isArray(order) || order.length !== ALL_WIDGET_IDS.length) {
    res.status(400).json({ error: 'Order must contain exactly 6 widget IDs' });
    return;
  }

  const uniqueIds = new Set(order);
  if (uniqueIds.size !== ALL_WIDGET_IDS.length) {
    res.status(400).json({ error: 'Order must contain unique widget IDs' });
    return;
  }

  for (const id of order) {
    if (!ALL_WIDGET_IDS.includes(id as WidgetId)) {
      res.status(400).json({ error: `Invalid widget ID: ${id}` });
      return;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < order.length; i++) {
        await tx.widgetLayout.update({
          where: { widgetId: order[i] as WidgetId },
          data: { position: -(i + 1) },
        });
      }

      for (let i = 0; i < order.length; i++) {
        await tx.widgetLayout.update({
          where: { widgetId: order[i] as WidgetId },
          data: { position: i },
        });
      }
    });

    res.json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

export default router;
