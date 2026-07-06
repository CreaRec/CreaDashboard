const DEFAULT_TIMEZONE = 'America/Chicago';

export function getAppTimeZone(): string {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

export function ensureAppTimeZone(): void {
  const timeZone = getAppTimeZone();
  if (process.env.TZ !== timeZone) {
    process.env.TZ = timeZone;
  }
}

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getLocalDateParts(
  date: Date,
  timeZone: string = getAppTimeZone()
): LocalDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

export function formatLocalDate(
  date: Date,
  timeZone: string = getAppTimeZone()
): string {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseLocalDate(
  dateValue: string,
  timeZone: string = getAppTimeZone()
): Date {
  const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid local date: ${dateValue}`);
  }

  return localDateTimeToDate(
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
    0,
    0,
    0,
    0,
    timeZone
  );
}

export function localDateTimeToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
  timeZone: string = getAppTimeZone()
): Date {
  let timestamp = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLocalDateParts(new Date(timestamp), timeZone);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute &&
      parts.second === second
    ) {
      return new Date(timestamp);
    }

    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    timestamp += desired - actual;
  }

  return new Date(timestamp);
}

export function startOfLocalDay(
  date: Date,
  timeZone: string = getAppTimeZone()
): Date {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return localDateTimeToDate(year, month, day, 0, 0, 0, 0, timeZone);
}

export function endOfLocalDay(
  date: Date,
  timeZone: string = getAppTimeZone()
): Date {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return localDateTimeToDate(year, month, day, 23, 59, 59, 999, timeZone);
}

export function addLocalDays(
  date: Date,
  days: number,
  timeZone: string = getAppTimeZone()
): Date {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  const anchor = localDateTimeToDate(year, month, day, 12, 0, 0, 0, timeZone);
  const shifted = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
  return startOfLocalDay(shifted, timeZone);
}

export function todayLocal(timeZone: string = getAppTimeZone()): Date {
  return startOfLocalDay(new Date(), timeZone);
}

export function yesterdayLocal(timeZone: string = getAppTimeZone()): Date {
  return addLocalDays(new Date(), -1, timeZone);
}
