import { PrismaClient, WidgetId } from '@prisma/client';

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  WidgetId.electricityMonthly,
  WidgetId.waterMonthly,
  WidgetId.waterBills,
  WidgetId.waterDaily,
  WidgetId.gasMonthly,
  WidgetId.gasBills,
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
  const count = await prisma.widgetLayout.count();
  if (count > 0) {
    return;
  }

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
}
