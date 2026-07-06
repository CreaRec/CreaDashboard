import { formatUtilityMonth } from '../smartMeterTexas/transform';
import { parseMonthlyXlsBuffer } from './xlsParser';
import type {
  AtmosBillingEntry,
  AtmosMergedMonthlyReading,
  AtmosMonthlyReading,
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

function chargeDateToMonth(chargeDate: Date): Date {
  return startOfUtcMonth(chargeDate.getUTCFullYear(), chargeDate.getUTCMonth() + 1);
}

function parseBillDateFromText(text: string): Date | null {
  const trimmed = text.trim();

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

  const monthDayYear = trimmed.match(
    /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})(?:\s+\d{1,2}:\d{2}:\d{2})?/i
  );
  if (monthDayYear) {
    const month = MONTH_NAMES[monthDayYear[1].toLowerCase().slice(0, 3)];
    const day = Number.parseInt(monthDayYear[2], 10);
    const year = Number.parseInt(monthDayYear[3], 10);
    if (month && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  return null;
}

function parseAmountUsd(text: string): number | null {
  const match = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseMonthlyXls(buffer: ArrayBuffer | Buffer): AtmosMonthlyReading[] {
  const rows = parseMonthlyXlsBuffer(buffer);

  return rows.map((row) => ({
    month: chargeDateToMonth(row.chargeDate),
    consumption: row.consumption,
    chargeDate: row.chargeDate,
    billingMonth: row.billingMonth,
  }));
}

export function parseBillingHistoryFromHtml(html: string): AtmosBillingEntry[] {
  const entries: AtmosBillingEntry[] = [];
  const seen = new Set<string>();

  const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rowMatches) {
    const rowHtml = row[1];
    if (!/view\s*bill/i.test(rowHtml) && !/\$\s*[\d,]+(?:\.\d{2})?/.test(rowHtml)) {
      continue;
    }

    const amount = parseAmountUsd(rowHtml);
    if (amount === null) {
      continue;
    }

    const textContent = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const dateMatch = textContent.match(
      /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/
    );
    if (!dateMatch) {
      continue;
    }

    const billDate = parseBillDateFromText(dateMatch[1]);
    if (!billDate) {
      continue;
    }

    const key = `${billDate.toISOString()}:${amount}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    entries.push({ billDate, amountUsd: amount });
  }

  return entries.sort((a, b) => a.billDate.getTime() - b.billDate.getTime());
}

export function billDateToMonth(billDate: Date): Date {
  return startOfUtcMonth(billDate.getUTCFullYear(), billDate.getUTCMonth() + 1);
}

export function estimateCost(ccf: number, ratePerCcf: number): number {
  return Math.round(ccf * ratePerCcf * 100) / 100;
}

export function mergeMonthlyAndBilling(
  monthlyReadings: AtmosMonthlyReading[],
  billingEntries: AtmosBillingEntry[],
  gasRatePerCcf?: number
): AtmosMergedMonthlyReading[] {
  const monthlyConsumption = new Map<string, number>();
  const monthlyCost = new Map<string, number>();

  for (const reading of monthlyReadings) {
    const monthKey = formatUtilityMonth(reading.month).slice(0, 7);
    monthlyConsumption.set(monthKey, reading.consumption);
  }

  for (const entry of billingEntries) {
    const monthKey = formatUtilityMonth(billDateToMonth(entry.billDate)).slice(0, 7);
    monthlyCost.set(monthKey, entry.amountUsd);
  }

  const months = new Set([...monthlyConsumption.keys(), ...monthlyCost.keys()]);
  const results: AtmosMergedMonthlyReading[] = [];

  for (const monthKey of [...months].sort()) {
    const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
    const consumption = monthlyConsumption.get(monthKey) ?? 0;
    const billedCost = monthlyCost.get(monthKey);
    const cost =
      billedCost ??
      (gasRatePerCcf !== undefined && consumption > 0
        ? estimateCost(consumption, gasRatePerCcf)
        : 0);

    results.push({
      month: startOfUtcMonth(year, month),
      consumption,
      cost,
    });
  }

  return results;
}

export function hasLoginPageIndicators(html: string): boolean {
  const lower = html.toLowerCase();
  const indicators = [
    'type="password"',
    'name="username"',
    'name="password"',
    'sign in to your account',
    'sign in to the account center',
  ];

  return indicators.some((indicator) => lower.includes(indicator));
}

export function hasSessionErrorIndicators(html: string): boolean {
  const lower = html.toLowerCase();
  const errors = [
    'access denied',
    'session expired',
    'not authorized',
    'session ended',
    'extended inactivity',
    'invalid username',
    'invalid password',
    'login failed',
    'authentication failed',
  ];

  return errors.some((error) => lower.includes(error));
}

export function extractFormTokens(html: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const matches = [...html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi)];

  for (const match of matches) {
    const name = match[1];
    const value = match[2];
    if (name) {
      tokens[name] = value ?? '';
    }
  }

  return tokens;
}
