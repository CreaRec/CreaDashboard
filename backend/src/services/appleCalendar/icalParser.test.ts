import { describe, expect, it } from 'vitest';
import {
  extractUidFromObjectUrl,
  getEventExternalId,
  parseIcalEvents,
} from './icalParser';

const TIMED_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:timed-event-1
DTSTART:20260710T150000Z
DTEND:20260710T160000Z
SUMMARY:Team meeting
END:VEVENT
END:VCALENDAR`;

const ALL_DAY_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:all-day-event-1
DTSTART;VALUE=DATE:20260715
DTEND;VALUE=DATE:20260716
SUMMARY:Holiday
END:VEVENT
END:VCALENDAR`;

const CANCELLED_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:cancelled-event-1
DTSTART:20260712T100000Z
DTEND:20260712T110000Z
SUMMARY:Cancelled call
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

describe('parseIcalEvents', () => {
  it('parses timed events', () => {
    const [event] = parseIcalEvents(TIMED_EVENT, 'America/Chicago');

    expect(event.uid).toBe('timed-event-1');
    expect(event.title).toBe('Team meeting');
    expect(event.cancelled).toBe(false);
    expect(event.start.toISOString()).toBe('2026-07-10T15:00:00.000Z');
    expect(event.end?.toISOString()).toBe('2026-07-10T16:00:00.000Z');
  });

  it('parses all-day events in the app timezone', () => {
    const [event] = parseIcalEvents(ALL_DAY_EVENT, 'America/Chicago');

    expect(event.uid).toBe('all-day-event-1');
    expect(event.title).toBe('Holiday');
    expect(event.start.toISOString()).toBe('2026-07-15T05:00:00.000Z');
    expect(event.end?.toISOString()).toBe('2026-07-16T05:00:00.000Z');
  });

  it('marks cancelled events', () => {
    const [event] = parseIcalEvents(CANCELLED_EVENT, 'America/Chicago');

    expect(event.uid).toBe('cancelled-event-1');
    expect(event.cancelled).toBe(true);
  });
});

describe('extractUidFromObjectUrl', () => {
  it('extracts uid from ics url', () => {
    expect(
      extractUidFromObjectUrl('https://caldav.icloud.com/calendars/home/ABC-123.ics')
    ).toBe('ABC-123');
  });
});

describe('getEventExternalId', () => {
  it('includes recurrence id when present', () => {
    const [event] = parseIcalEvents(
      `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-event
DTSTART:20260710T150000Z
DTEND:20260710T160000Z
RECURRENCE-ID:20260717T150000Z
SUMMARY:Weekly sync
END:VEVENT
END:VCALENDAR`,
      'America/Chicago'
    );

    expect(event.uid).toContain('recurring-event');
    expect(event.uid).toContain('::');
  });
});
