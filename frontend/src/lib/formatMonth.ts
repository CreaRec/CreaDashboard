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

export function formatMonthLabel(monthDate: string): string {
  const match = monthDate.match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return monthDate;
  }

  const month = Number.parseInt(match[2], 10);
  return MONTH_LABELS[month - 1] ?? monthDate;
}
