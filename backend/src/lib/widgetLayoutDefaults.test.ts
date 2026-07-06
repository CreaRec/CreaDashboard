import { describe, expect, it, vi } from 'vitest';
import { PrismaClient, WidgetId } from '@prisma/client';
import {
  DEFAULT_VISIBILITY,
  DEFAULT_WIDGET_ORDER,
  ensureDefaultWidgetLayouts,
  getDefaultVisibility,
} from './widgetLayoutDefaults';

function createLayoutPrismaMock(
  existing: Array<{ widgetId: WidgetId; position: number; visible: boolean }>
) {
  const layouts = existing.map((layout) => ({ ...layout }));

  return {
    widgetLayout: {
      findMany: vi.fn(async () => layouts.map((layout) => ({ ...layout }))),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { widgetId: WidgetId; position: number; visible: boolean };
        }) => {
          layouts.push({ ...data });
          return data;
        }
      ),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    ),
  } as unknown as PrismaClient;
}

describe('widget layout defaults', () => {
  it('orders all widgets with electricity widgets last', () => {
    expect(DEFAULT_WIDGET_ORDER).toEqual([
      WidgetId.electricityMonthly,
      WidgetId.electricityBills,
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
    ]);
  });

  it('hides electricity interval/current and water daily widgets by default', () => {
    expect(DEFAULT_VISIBILITY[WidgetId.electricityIntervals]).toBe(false);
    expect(DEFAULT_VISIBILITY[WidgetId.electricityCurrent]).toBe(false);
    expect(DEFAULT_VISIBILITY[WidgetId.waterDaily]).toBe(false);
    expect(DEFAULT_VISIBILITY[WidgetId.calendar]).toBeUndefined();
  });

  it('builds full visibility map with defaults', () => {
    const visibility = getDefaultVisibility();

    expect(visibility[WidgetId.calendar]).toBe(true);
    expect(visibility[WidgetId.electricityIntervals]).toBe(false);
    expect(visibility[WidgetId.electricityCurrent]).toBe(false);
  });

  it('seeds all widgets when layout table is empty', async () => {
    const prisma = createLayoutPrismaMock([]);

    await ensureDefaultWidgetLayouts(prisma);

    expect(prisma.widgetLayout.create).toHaveBeenCalledTimes(
      DEFAULT_WIDGET_ORDER.length
    );
  });

  it('adds missing widgets without changing existing rows', async () => {
    const prisma = createLayoutPrismaMock([
      {
        widgetId: WidgetId.electricityMonthly,
        position: 0,
        visible: false,
      },
      {
        widgetId: WidgetId.waterMonthly,
        position: 1,
        visible: true,
      },
    ]);

    await ensureDefaultWidgetLayouts(prisma);

    const createdWidgetIds = vi
      .mocked(prisma.widgetLayout.create)
      .mock.calls.map(([call]) => call.data.widgetId);

    expect(createdWidgetIds).toContain(WidgetId.electricityBills);
    expect(createdWidgetIds).not.toContain(WidgetId.electricityMonthly);
    expect(createdWidgetIds).not.toContain(WidgetId.waterMonthly);
    expect(createdWidgetIds).toHaveLength(
      DEFAULT_WIDGET_ORDER.length - 2
    );
  });
});
