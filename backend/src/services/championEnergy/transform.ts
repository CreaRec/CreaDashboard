import { formatUtilityMonth } from '../smartMeterTexas/transform';
import type { ChampionInvoice, ChampionMonthlyBill } from './types';

function startOfUtcMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function parseBillDate(value: string): Date | null {
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

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function billDateToMonth(billDate: Date): Date {
  return startOfUtcMonth(billDate.getUTCFullYear(), billDate.getUTCMonth() + 1);
}

export function parseInvoiceAmount(invoice: ChampionInvoice): number | null {
  const amount = invoice.amountDue ?? invoice.currentCharges;
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return null;
  }

  return Math.round(Number(amount) * 100) / 100;
}

export function invoicesToMonthlyBills(invoices: ChampionInvoice[]): ChampionMonthlyBill[] {
  const monthlyAmounts = new Map<string, number>();

  for (const invoice of invoices) {
    const billDate = parseBillDate(invoice.billDate);
    const amount = parseInvoiceAmount(invoice);
    if (!billDate || amount === null || amount <= 0) {
      continue;
    }

    const month = billDateToMonth(billDate);
    const monthKey = formatUtilityMonth(month).slice(0, 7);
    monthlyAmounts.set(monthKey, amount);
  }

  return [...monthlyAmounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, amount]) => {
      const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
      return {
        month: startOfUtcMonth(year, month),
        amount,
      };
    });
}
