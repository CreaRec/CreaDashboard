import { afterEach, describe, expect, it } from 'vitest';
import {
  addLocalDays,
  endOfLocalDay,
  formatLocalDate,
  getLocalDateParts,
  localDateTimeToDate,
  parseLocalDate,
  startOfLocalDay,
  yesterdayLocal,
} from './timezone';

const TZ = 'America/Chicago';

afterEach(() => {
  delete process.env.APP_TIMEZONE;
});

describe('timezone', () => {
  it('formats and parses local calendar dates', () => {
    process.env.APP_TIMEZONE = TZ;
    const date = parseLocalDate('2026-07-05', TZ);
    expect(formatLocalDate(date, TZ)).toBe('2026-07-05');
  });

  it('builds local day boundaries in CDT', () => {
    process.env.APP_TIMEZONE = TZ;
    const day = parseLocalDate('2026-07-05', TZ);
    expect(startOfLocalDay(day, TZ).toISOString()).toBe('2026-07-05T05:00:00.000Z');
    expect(endOfLocalDay(day, TZ).toISOString()).toBe('2026-07-06T04:59:59.999Z');
  });

  it('maps SMT interval timestamps to local wall time', () => {
    process.env.APP_TIMEZONE = TZ;
    const timestamp = localDateTimeToDate(2026, 7, 4, 0, 0, 0, 0, TZ);
    const parts = getLocalDateParts(timestamp, TZ);
    expect(parts).toMatchObject({
      year: 2026,
      month: 7,
      day: 4,
      hour: 0,
      minute: 0,
    });
  });

  it('returns yesterday relative to local calendar', () => {
    process.env.APP_TIMEZONE = TZ;
    const reference = localDateTimeToDate(2026, 7, 5, 21, 0, 0, 0, TZ);
    const yesterday = addLocalDays(reference, -1, TZ);
    expect(formatLocalDate(yesterday, TZ)).toBe('2026-07-04');
    expect(formatLocalDate(yesterdayLocal(TZ), TZ)).toBe(
      formatLocalDate(addLocalDays(new Date(), -1, TZ), TZ)
    );
  });
});
