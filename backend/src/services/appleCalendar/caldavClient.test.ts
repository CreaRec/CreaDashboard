import { describe, expect, it } from 'vitest';
import type { DAVCalendar } from 'tsdav';
import {
  filterCalendarsByName,
  formatCalDavDate,
  getCalendarDisplayName,
} from './caldavClient';

function createCalendar(displayName: string, url: string): DAVCalendar {
  return {
    displayName,
    url,
  };
}

describe('getCalendarDisplayName', () => {
  it('returns string display names', () => {
    expect(getCalendarDisplayName(createCalendar('Home', 'https://example.com/home'))).toBe(
      'Home'
    );
  });
});

describe('filterCalendarsByName', () => {
  it('filters calendars case-insensitively', () => {
    const calendars = [
      createCalendar('Home', 'https://example.com/home'),
      createCalendar('Work', 'https://example.com/work'),
      createCalendar('Family', 'https://example.com/family'),
    ];

    const filtered = filterCalendarsByName(calendars, ['home', 'WORK']);

    expect(filtered.map((calendar) => calendar.url)).toEqual([
      'https://example.com/home',
      'https://example.com/work',
    ]);
  });
});

describe('formatCalDavDate', () => {
  it('formats dates as ISO 8601 for tsdav timeRange', () => {
    expect(formatCalDavDate(new Date('2026-07-10T15:30:45.123Z'))).toBe(
      '2026-07-10T15:30:45.123Z'
    );
  });
});
