import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../../types';
import {
  getDateKey,
  getEventDaysInMonth,
  getEventsForDay,
  getUpcomingEvents,
  isToday,
  shiftMonth,
} from './calendarUtils';

function makeEvent(id: string, start: string): CalendarEvent {
  return { id, title: id, start, source: 'apple' };
}

describe('getDateKey', () => {
  it('returns a local YYYY-MM-DD key', () => {
    expect(getDateKey(new Date(2026, 6, 6, 15, 30))).toBe('2026-07-06');
  });
});

describe('getEventsForDay', () => {
  const events = [
    makeEvent('1', '2026-07-06T09:00:00'),
    makeEvent('2', '2026-07-06T18:30:00'),
    makeEvent('3', '2026-07-13T10:00:00'),
    makeEvent('4', '2026-08-06T10:00:00'),
  ];

  it('returns events for the selected day sorted by start time', () => {
    expect(getEventsForDay(events, 2026, 6, 6).map((event) => event.id)).toEqual([
      '1',
      '2',
    ]);
  });

  it('returns an empty list when there are no events on that day', () => {
    expect(getEventsForDay(events, 2026, 6, 1)).toEqual([]);
  });
});

describe('getEventDaysInMonth', () => {
  const events = [
    makeEvent('1', '2026-07-06T09:00:00'),
    makeEvent('2', '2026-07-13T10:00:00'),
    makeEvent('3', '2026-08-06T10:00:00'),
  ];

  it('returns only days with events in the requested month', () => {
    expect(getEventDaysInMonth(events, 2026, 6)).toEqual(new Set([6, 13]));
  });

  it('does not include days from events in other months', () => {
    expect(getEventDaysInMonth(events, 2026, 6).has(6)).toBe(true);
    expect(getEventDaysInMonth(events, 2026, 7)).toEqual(new Set([6]));
  });
});

describe('getUpcomingEvents', () => {
  const events = [
    makeEvent('past', '2026-06-29T09:30:00'),
    makeEvent('today-past', '2026-07-06T08:00:00'),
    makeEvent('today-future', '2026-07-06T18:00:00'),
    makeEvent('july', '2026-07-13T00:00:00'),
    makeEvent('august', '2026-08-08T12:00:00'),
  ];

  it('excludes past events and returns the next ones chronologically', () => {
    const now = new Date(2026, 6, 6, 12, 0);

    expect(getUpcomingEvents(events, now, 4).map((event) => event.id)).toEqual([
      'today-future',
      'july',
      'august',
    ]);
  });
});

describe('shiftMonth', () => {
  it('moves to the previous month', () => {
    expect(shiftMonth(2026, 6, -1)).toEqual({ year: 2026, month: 5 });
  });

  it('moves to the next month', () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
  });

  it('rolls over to the next year', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });
});

describe('isToday', () => {
  it('returns true only for the current local date', () => {
    const now = new Date(2026, 6, 6, 15, 0);

    expect(isToday(2026, 6, 6, now)).toBe(true);
    expect(isToday(2026, 6, 7, now)).toBe(false);
    expect(isToday(2026, 5, 6, now)).toBe(false);
  });
});
