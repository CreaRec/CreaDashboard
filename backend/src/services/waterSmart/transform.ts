import { parseLocalDate } from '../../lib/timezone';
import { formatUtilityMonth } from '../smartMeterTexas/transform';
import type {
  WaterSmartBillingEntry,
  WaterSmartDailyReading,
  WaterSmartMonthlyReading,
} from './types';

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function startOfUtcMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function parseGallons(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseWeatherConsumptionChart(payload: unknown): WaterSmartDailyReading[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = (payload as { data?: { chartData?: { dailyData?: unknown } } }).data;
  const dailyData = data?.chartData?.dailyData;
  if (!dailyData || typeof dailyData !== 'object') {
    return [];
  }

  const categories = (dailyData as { categories?: unknown }).categories;
  const consumption = (dailyData as { consumption?: unknown }).consumption;

  if (!Array.isArray(categories) || !Array.isArray(consumption)) {
    return [];
  }

  const readings: WaterSmartDailyReading[] = [];
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    if (typeof category !== 'string') {
      continue;
    }

    const gallons = parseGallons(consumption[index]);
    if (gallons === null || gallons === undefined) {
      continue;
    }

    readings.push({
      date: parseLocalDate(category),
      gallons,
    });
  }

  return readings;
}

export function parseAccountNumberFromViewBill(html: string): string | null {
  const match = html.match(/Account Number:\s*<\/span>\s*<span>\s*<var>([^<]+)<\/var>/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  const fallback = html.match(/Account Number:\s*<\/span>\s*<span>([^<]+)<\/span>/i);
  return fallback?.[1]?.trim() ?? null;
}

function parseBillDateFromRow(rowHtml: string): Date | null {
  const monthMatch = rowHtml.match(/<span[^>]*isolate[^>]*>([A-Za-z]+)<\/span>\s*<var>(\d+)<\/var>,\s*<var>(\d{4})<\/var>/i);
  if (!monthMatch) {
    return null;
  }

  const month = MONTH_NAMES[monthMatch[1].toLowerCase().slice(0, 3)];
  const day = Number.parseInt(monthMatch[2], 10);
  const year = Number.parseInt(monthMatch[3], 10);

  if (!month || Number.isNaN(day) || Number.isNaN(year)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function parseAmountUsdFromRow(rowHtml: string): number | null {
  const match = rowHtml.match(/<var>\$([\d,]+(?:\.\d{2})?)<\/var>/i);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBillIdFromRow(rowHtml: string): string | null {
  const match = rowHtml.match(/billDetails\?billID=(\d+)/i);
  return match?.[1] ?? null;
}

export function parseBillingHistoryFromViewBill(html: string): WaterSmartBillingEntry[] {
  const tableMatch = html.match(/<table class="bill">([\s\S]*?)<\/table>/i);
  if (!tableMatch?.[1]) {
    return [];
  }

  const rows = [...tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  const entries: WaterSmartBillingEntry[] = [];

  for (const row of rows) {
    const rowHtml = row[1];
    const billDate = parseBillDateFromRow(rowHtml);
    const amountUsd = parseAmountUsdFromRow(rowHtml);
    const billId = parseBillIdFromRow(rowHtml);

    if (!billDate || amountUsd === null || !billId) {
      continue;
    }

    entries.push({ billDate, amountUsd, billId });
  }

  return entries;
}

export function billDateToMonth(billDate: Date): Date {
  return startOfUtcMonth(billDate.getUTCFullYear(), billDate.getUTCMonth() + 1);
}

export function aggregateMonthlyFromDaily(
  dailyReadings: WaterSmartDailyReading[],
  billingEntries: WaterSmartBillingEntry[],
  waterRatePerGallon?: number
): WaterSmartMonthlyReading[] {
  const monthlyConsumption = new Map<string, number>();
  const monthlyCost = new Map<string, number>();

  for (const reading of dailyReadings) {
    const month = formatUtilityMonth(reading.date).slice(0, 7);
    monthlyConsumption.set(month, (monthlyConsumption.get(month) ?? 0) + reading.gallons);
  }

  for (const entry of billingEntries) {
    const month = formatUtilityMonth(billDateToMonth(entry.billDate)).slice(0, 7);
    monthlyCost.set(month, entry.amountUsd);
  }

  const months = new Set([...monthlyConsumption.keys(), ...monthlyCost.keys()]);
  const results: WaterSmartMonthlyReading[] = [];

  for (const monthKey of [...months].sort()) {
    const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
    const consumption = monthlyConsumption.get(monthKey) ?? 0;
    const billedCost = monthlyCost.get(monthKey);
    const cost =
      billedCost ??
      (waterRatePerGallon !== undefined ? estimateCost(consumption, waterRatePerGallon) : 0);

    results.push({
      month: startOfUtcMonth(year, month),
      consumption,
      cost,
    });
  }

  return results;
}

export function estimateCost(gallons: number, ratePerGallon: number): number {
  return Math.round(gallons * ratePerGallon * 100) / 100;
}

export function hasLoginErrors(html: string): boolean {
  return /<div[^>]*class="[^"]*error-message[^"]*"[^>]*>\s*[^<\s]/i.test(html);
}

export function extractLoginRefreshToken(html: string): string | null {
  const match = html.match(/name="loginRefreshToken"[^>]*value="([^"]*)"/i);
  return match?.[1] ?? null;
}
