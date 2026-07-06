const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function monthSortKey(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return month;
  }

  const index = MONTH_LABELS.indexOf(month as (typeof MONTH_LABELS)[number]);
  if (index >= 0) {
    return `0000-${String(index + 1).padStart(2, '0')}`;
  }

  return month;
}

export function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return monthKey;
  }

  const month = Number.parseInt(match[2], 10);
  return MONTH_LABELS[month - 1] ?? monthKey;
}
