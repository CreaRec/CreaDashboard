import { Router } from 'express';
import { WidgetId } from '@prisma/client';
import { ensureDefaultWidgetLayouts } from '../lib/widgetLayoutDefaults';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';

const router = Router();
const log = createLogger('layout');

export const ALL_WIDGET_IDS = Object.values(WidgetId);

function buildVisibilityMap(
  layouts: Array<{ widgetId: WidgetId; visible: boolean }>
): Record<WidgetId, boolean> {
  const visibility = {} as Record<WidgetId, boolean>;

  for (const widgetId of ALL_WIDGET_IDS) {
    const layout = layouts.find((entry) => entry.widgetId === widgetId);
    visibility[widgetId] = layout?.visible ?? true;
  }

  return visibility;
}

export function validateLayoutPayload(order: unknown, visibility: unknown): string | null {
  if (!Array.isArray(order) || order.length !== ALL_WIDGET_IDS.length) {
    return `Order must contain exactly ${ALL_WIDGET_IDS.length} widget IDs`;
  }

  const uniqueIds = new Set(order);
  if (uniqueIds.size !== ALL_WIDGET_IDS.length) {
    return 'Order must contain unique widget IDs';
  }

  for (const id of order) {
    if (!ALL_WIDGET_IDS.includes(id as WidgetId)) {
      return `Invalid widget ID: ${id}`;
    }
  }

  if (!visibility || typeof visibility !== 'object') {
    return 'Visibility must be an object';
  }

  for (const widgetId of ALL_WIDGET_IDS) {
    const value = (visibility as Record<string, unknown>)[widgetId];
    if (typeof value !== 'boolean') {
      return `Visibility for ${widgetId} must be a boolean`;
    }
  }

  return null;
}

router.get('/', async (_req, res) => {
  log.debug('GET /');
  try {
    await ensureDefaultWidgetLayouts(prisma);
    const layouts = await prisma.widgetLayout.findMany({
      orderBy: { position: 'asc' },
    });

    log.debug('Layout loaded', { widgetCount: layouts.length });
    res.json({
      order: layouts.map((layout) => layout.widgetId),
      visibility: buildVisibilityMap(layouts),
    });
  } catch (error) {
    log.error('Failed to fetch layout', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

router.put('/', async (req, res) => {
  const { order, visibility } = req.body as {
    order?: string[];
    visibility?: Record<string, boolean>;
  };

  log.debug('PUT /', { orderLength: order?.length ?? 0 });

  const validationError = validateLayoutPayload(order, visibility);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < order!.length; i++) {
        await tx.widgetLayout.update({
          where: { widgetId: order![i] as WidgetId },
          data: { position: -(i + 1) },
        });
      }

      for (let i = 0; i < order!.length; i++) {
        const widgetId = order![i] as WidgetId;
        await tx.widgetLayout.update({
          where: { widgetId },
          data: {
            position: i,
            visible: visibility![widgetId],
          },
        });
      }
    });

    log.debug('Layout saved');
    res.json({ order, visibility });
  } catch (error) {
    log.error('Failed to save layout', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

export default router;
