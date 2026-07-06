import type { CalendarEvent } from '../../types';

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEventsForDay(
  events: CalendarEvent[],
  year: number,
  month: number,
  day: number
): CalendarEvent[] {
  const targetKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return events
    .filter((event) => getDateKey(new Date(event.start)) === targetKey)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function getEventDaysInMonth(
  events: CalendarEvent[],
  year: number,
  month: number
): Set<number> {
  const days = new Set<number>();

  for (const event of events) {
    const date = new Date(event.start);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  }

  return days;
}

export function getUpcomingEvents(
  events: CalendarEvent[],
  now: Date = new Date(),
  limit = 4
): CalendarEvent[] {
  const nowMs = now.getTime();

  return [...events]
    .filter((event) => new Date(event.start).getTime() >= nowMs)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, limit);
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isSameMonth(
  a: { year: number; month: number },
  b: { year: number; month: number }
): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isToday(
  year: number,
  month: number,
  day: number,
  now: Date = new Date()
): boolean {
  return (
    year === now.getFullYear() &&
    month === now.getMonth() &&
    day === now.getDate()
  );
}
