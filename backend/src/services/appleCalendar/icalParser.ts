import ICAL from 'ical.js';
import { getAppTimeZone, parseLocalDate } from '../../lib/timezone';
import type { ParsedCalendarEvent } from './types';

function formatIcalDateValue(time: ICAL.Time): string {
  if (time.isDate) {
    const year = String(time.year).padStart(4, '0');
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return time.toJSDate().toISOString();
}

function icalTimeToDate(time: ICAL.Time, timeZone: string): Date {
  if (time.isDate) {
    return parseLocalDate(formatIcalDateValue(time), timeZone);
  }

  return time.toJSDate();
}

export function getEventExternalId(event: ICAL.Event): string {
  const recurrenceId = event.component.getFirstProperty('recurrence-id');
  if (recurrenceId) {
    const value = recurrenceId.getFirstValue();
    if (value instanceof ICAL.Time) {
      return `${event.uid}::${value.toICALString()}`;
    }
  }

  return event.uid;
}

export function parseIcalEvents(
  icalData: string,
  timeZone: string = getAppTimeZone()
): ParsedCalendarEvent[] {
  const jcal = ICAL.parse(icalData);
  const component = new ICAL.Component(jcal);
  const events: ParsedCalendarEvent[] = [];

  for (const vevent of component.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    const status = vevent.getFirstPropertyValue('status');
    const cancelled = status === 'CANCELLED';
    const start = icalTimeToDate(event.startDate, timeZone);
    const end = event.endDate ? icalTimeToDate(event.endDate, timeZone) : null;

    events.push({
      uid: getEventExternalId(event),
      title: event.summary?.trim() || '(No title)',
      start,
      end,
      cancelled,
    });
  }

  return events;
}

export function extractUidFromObjectUrl(objectUrl: string): string | null {
  try {
    const pathname = new URL(objectUrl).pathname;
    const filename = pathname.split('/').pop();
    if (!filename) {
      return null;
    }

    return filename.replace(/\.ics$/i, '') || null;
  } catch {
    const filename = objectUrl.split('/').pop();
    if (!filename) {
      return null;
    }

    return filename.replace(/\.ics$/i, '') || null;
  }
}
