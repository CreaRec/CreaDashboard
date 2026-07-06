import * as XLSX from 'xlsx';
import { AtmosParseError } from './types';

export interface MonthlyXlsRow {
  consumption: number;
  chargeDate: Date;
  billingMonth?: string;
  meterReadDate?: string;
  avgTemp?: number;
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(
        Date.UTC(
          Number.parseInt(isoMatch[1], 10),
          Number.parseInt(isoMatch[2], 10) - 1,
          Number.parseInt(isoMatch[3], 10)
        )
      );
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return new Date(
        Date.UTC(
          Number.parseInt(slashMatch[3], 10),
          Number.parseInt(slashMatch[1], 10) - 1,
          Number.parseInt(slashMatch[2], 10)
        )
      );
    }
  }

  return null;
}

export function parseMonthlyXlsBuffer(buffer: ArrayBuffer | Buffer): MonthlyXlsRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AtmosParseError('Monthly XLS has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length === 0) {
    return [];
  }

  const columnMap = new Map<string, string>();
  for (const key of Object.keys(rows[0])) {
    columnMap.set(normalizeColumnName(key), key);
  }

  const consumptionKey = columnMap.get('consumption');
  const chargeDateKey =
    columnMap.get('charge date') ?? columnMap.get('chargedate') ?? columnMap.get('bill date');
  const billingMonthKey = columnMap.get('billing month') ?? columnMap.get('billingmonth');
  const meterReadDateKey = columnMap.get('meter read date') ?? columnMap.get('meterreaddate');
  const avgTempKey = columnMap.get('avg temp') ?? columnMap.get('avgtemp');

  if (!consumptionKey) {
    throw new AtmosParseError(
      `Missing consumption column in monthly XLS. Found: ${[...columnMap.keys()].join(', ')}`
    );
  }

  if (!chargeDateKey) {
    throw new AtmosParseError(
      `Missing charge date column in monthly XLS. Found: ${[...columnMap.keys()].join(', ')}`
    );
  }

  const results: MonthlyXlsRow[] = [];

  for (const row of rows) {
    const consumption = parseNumber(row[consumptionKey]);
    const chargeDate = parseExcelDate(row[chargeDateKey]);

    if (consumption === null || chargeDate === null) {
      continue;
    }

    const billingMonth =
      billingMonthKey && row[billingMonthKey] != null
        ? String(row[billingMonthKey]).trim()
        : undefined;
    const meterReadDate =
      meterReadDateKey && row[meterReadDateKey] != null
        ? String(row[meterReadDateKey]).trim()
        : undefined;
    const avgTemp = avgTempKey ? parseNumber(row[avgTempKey]) : null;

    results.push({
      consumption,
      chargeDate,
      billingMonth,
      meterReadDate,
      avgTemp: avgTemp ?? undefined,
    });
  }

  return results.sort((a, b) => a.chargeDate.getTime() - b.chargeDate.getTime());
}
