import { describe, expect, it } from 'vitest';
import { WidgetId } from '@prisma/client';
import { ALL_WIDGET_IDS, validateLayoutPayload } from './layout';

describe('layout validation', () => {
  const visibility = Object.fromEntries(
    ALL_WIDGET_IDS.map((widgetId) => [widgetId, true])
  ) as Record<WidgetId, boolean>;

  it('accepts valid order and visibility', () => {
    expect(validateLayoutPayload(ALL_WIDGET_IDS, visibility)).toBeNull();
  });

  it('rejects wrong number of widgets', () => {
    expect(
      validateLayoutPayload(ALL_WIDGET_IDS.slice(0, 3), visibility)
    ).toContain('exactly');
  });

  it('rejects duplicate widget ids', () => {
    const duplicateOrder = [...ALL_WIDGET_IDS];
    duplicateOrder[1] = duplicateOrder[0];

    expect(validateLayoutPayload(duplicateOrder, visibility)).toContain('unique');
  });

  it('rejects invalid widget id', () => {
    const invalidOrder = [...ALL_WIDGET_IDS];
    invalidOrder[0] = 'invalid' as WidgetId;

    expect(validateLayoutPayload(invalidOrder, visibility)).toContain('Invalid widget ID');
  });

  it('rejects missing visibility flag', () => {
    const partialVisibility = { ...visibility };
    partialVisibility[WidgetId.water] = undefined as unknown as boolean;

    expect(validateLayoutPayload(ALL_WIDGET_IDS, partialVisibility)).toContain(
      'Visibility for water'
    );
  });
});
