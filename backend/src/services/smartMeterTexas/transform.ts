import type {
  SmtCurrentReading,
  SmtIntervalReading,
  SmtMeter,
  SmtMonthlyReading,
} from './types';

function parseConsumption(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

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

export function parseMonthKey(dateValue: string): string {
  const isoMatch = dateValue.trim().match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }

  const parts = dateValue.split('/');
  if (parts.length !== 3) {
    return dateValue;
  }

  const month = Number.parseInt(parts[0], 10);
  const year = Number.parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(year)) {
    return dateValue;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return monthKey;
  }

  const month = Number.parseInt(match[2], 10);
  return MONTH_LABELS[month - 1] ?? monthKey;
}

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

export function sortMonthlyReadings<T extends { month: string }>(readings: T[]): T[] {
  return [...readings].sort((a, b) => monthSortKey(a.month).localeCompare(monthSortKey(b.month)));
}

function parseSmtDateParts(dateValue: string): { year: number; month: number; day: number } | null {
  const date = dateValue.trim();

  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number.parseInt(isoMatch[1], 10),
      month: Number.parseInt(isoMatch[2], 10),
      day: Number.parseInt(isoMatch[3], 10),
    };
  }

  const slashParts = date.split('/');
  if (slashParts.length === 3) {
    const month = Number.parseInt(slashParts[0], 10);
    const day = Number.parseInt(slashParts[1], 10);
    const year = Number.parseInt(slashParts[2], 10);
    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      return { year, month, day };
    }
  }

  return null;
}

function parseTimeLabel(timeValue: string): { hours: number; minutes: number } {
  const normalized = timeValue.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!match) {
    return { hours: 0, minutes: 0 };
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'pm' && hours !== 12) {
    hours += 12;
  }
  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function parseMetersResponse(payload: unknown): SmtMeter[] {
  const data = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      const meter = entry as Record<string, unknown>;
      return {
        esiid: String(meter.esiid ?? ''),
        meterNumber: String(meter.meterNumber ?? ''),
        address: String(meter.address ?? ''),
      };
    })
    .filter((meter) => meter.esiid.length > 0);
}

export function parseMonthlyResponse(payload: unknown): SmtMonthlyReading[] {
  const monthlyData = (payload as { monthlyData?: unknown[] })?.monthlyData;
  if (!Array.isArray(monthlyData)) {
    return [];
  }

  return monthlyData.map((entry) => {
    const row = entry as Record<string, unknown>;

    if (row.actl_kwh_usg !== undefined || row.enddate !== undefined || row.startdate !== undefined) {
      const date = String(row.enddate ?? row.startdate ?? '');
      return {
        month: parseMonthKey(date),
        consumption: parseConsumption(row.actl_kwh_usg ?? row.mtrd_kwh_usg ?? row.blld_kwh_usg),
      };
    }

    const date = String(row.date ?? row.month ?? '');
    return {
      month: parseMonthKey(date),
      consumption: parseConsumption(row.reading ?? row.consumption ?? row.kwh),
    };
  });
}

export function parseIntervalResponse(payload: unknown): SmtIntervalReading[] {
  const intervalData = (payload as { intervaldata?: unknown[] })?.intervaldata;
  if (!Array.isArray(intervalData)) {
    return [];
  }

  const readings: SmtIntervalReading[] = [];

  for (const entry of intervalData) {
    const row = entry as Record<string, unknown>;
    const date = String(row.date ?? '').trim();
    const startTime = String(row.starttime ?? '').trim();
    const consumption = parseConsumption(row.consumption);

    if (!date || !startTime) {
      continue;
    }

    const { hours, minutes } = parseTimeLabel(startTime);
    const dateParts = parseSmtDateParts(date);
    if (!dateParts) {
      continue;
    }

    const timestamp = new Date(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      hours,
      minutes
    );
    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }

    readings.push({ timestamp, kwh: consumption });
  }

  return readings;
}

export function parseOdrResponse(payload: unknown): SmtCurrentReading | null {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  if (!data) {
    return null;
  }

  const status = String(data.odrstatus ?? '');
  if (status !== 'COMPLETED') {
    return null;
  }

  const readingKwh = parseConsumption(data.odrread);
  const readAtRaw = String(data.odrdate ?? '');
  const readAt = readAtRaw ? new Date(readAtRaw) : new Date();

  return { readingKwh, readAt };
}

export function estimateCost(
  consumption: number,
  ratePerKwh?: number
): number {
  if (ratePerKwh === undefined) {
    return 0;
  }
  return Math.round(consumption * ratePerKwh * 100) / 100;
}

export function formatSmtDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
