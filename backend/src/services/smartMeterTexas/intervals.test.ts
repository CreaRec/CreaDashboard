import { describe, expect, it } from 'vitest';
import { parseLocalDate } from '../../lib/timezone';
import { getIntervalLookupDates, INTERVAL_FALLBACK_DAYS } from './intervals';

describe('getIntervalLookupDates', () => {
  const today = parseLocalDate('2026-07-06');

  it('returns only the requested date when date param is provided', () => {
    expect(getIntervalLookupDates('2026-07-04', today)).toEqual([
      parseLocalDate('2026-07-04'),
    ]);
  });

  it('returns today and previous days when no date param is provided', () => {
    const dates = getIntervalLookupDates(null, today);

    expect(dates).toHaveLength(INTERVAL_FALLBACK_DAYS);
    expect(dates[0]).toEqual(today);
    expect(dates[1]).toEqual(parseLocalDate('2026-07-05'));
    expect(dates[2]).toEqual(parseLocalDate('2026-07-04'));
  });
});
