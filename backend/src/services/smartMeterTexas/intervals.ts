import { addLocalDays, parseLocalDate, todayLocal } from '../../lib/timezone';

export const INTERVAL_FALLBACK_DAYS = 7;

export function getIntervalLookupDates(
  dateParam: string | null,
  today: Date = todayLocal()
): Date[] {
  if (dateParam) {
    return [parseLocalDate(dateParam)];
  }

  const dates: Date[] = [];
  let date = today;

  for (let index = 0; index < INTERVAL_FALLBACK_DAYS; index += 1) {
    dates.push(date);
    date = addLocalDays(date, -1);
  }

  return dates;
}
