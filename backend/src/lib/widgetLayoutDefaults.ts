import { PrismaClient, WidgetId } from '@prisma/client';

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  WidgetId.electricityMonthly,
  WidgetId.electricityBills,
  WidgetId.waterMonthly,
  WidgetId.waterBills,
  WidgetId.waterDaily,
  WidgetId.gasMonthly,
  WidgetId.gasBills,
  WidgetId.localRestrictions,
  WidgetId.calendar,
  WidgetId.reminders,
  WidgetId.notes,
  WidgetId.electricityIntervals,
  WidgetId.electricityCurrent,
];

export const DEFAULT_VISIBILITY: Partial<Record<WidgetId, boolean>> = {
  [WidgetId.electricityIntervals]: false,
  [WidgetId.electricityCurrent]: false,
  [WidgetId.waterDaily]: false,
};

export function getDefaultVisibility(): Record<WidgetId, boolean> {
  return Object.fromEntries(
    DEFAULT_WIDGET_ORDER.map((widgetId) => [
      widgetId,
      DEFAULT_VISIBILITY[widgetId] ?? true,
    ])
  ) as Record<WidgetId, boolean>;
}

export async function ensureDefaultWidgetLayouts(prisma: PrismaClient) {
  const existing = await prisma.widgetLayout.findMany();

  if (existing.length === 0) {
    await prisma.$transaction(
      DEFAULT_WIDGET_ORDER.map((widgetId, position) =>
        prisma.widgetLayout.create({
          data: {
            widgetId,
            position,
            visible: DEFAULT_VISIBILITY[widgetId] ?? true,
          },
        })
      )
    );
    return;
  }

  const existingIds = new Set(existing.map((layout) => layout.widgetId));
  const missing = DEFAULT_WIDGET_ORDER.filter(
    (widgetId) => !existingIds.has(widgetId)
  );

  if (missing.length === 0) {
    return;
  }

  const maxPosition = Math.max(...existing.map((layout) => layout.position), -1);

  await prisma.$transaction(
    missing.map((widgetId, index) =>
      prisma.widgetLayout.create({
        data: {
          widgetId,
          position: maxPosition + 1 + index,
          visible: DEFAULT_VISIBILITY[widgetId] ?? true,
        },
      })
    )
  );
}
