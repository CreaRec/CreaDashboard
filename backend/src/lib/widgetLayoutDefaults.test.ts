import { describe, expect, it } from 'vitest';
import { WidgetId } from '@prisma/client';
import {
  DEFAULT_VISIBILITY,
  DEFAULT_WIDGET_ORDER,
  getDefaultVisibility,
} from './widgetLayoutDefaults';

describe('widget layout defaults', () => {
  it('orders all widgets with electricity widgets last', () => {
    expect(DEFAULT_WIDGET_ORDER).toEqual([
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
});
