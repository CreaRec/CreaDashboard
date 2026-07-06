import { describe, expect, it } from 'vitest';
import { MOCK_CHAMPION_INVOICES } from '../../mocks/championResponses';
import {
  billDateToMonth,
  invoicesToMonthlyBills,
  parseBillDate,
  parseInvoiceAmount,
} from './transform';

describe('championEnergy transform', () => {
  it('parses ISO bill dates', () => {
    const billDate = parseBillDate('2026-05-15');
    expect(billDate?.toISOString()).toBe('2026-05-15T00:00:00.000Z');
  });

  it('parses slash bill dates', () => {
    const billDate = parseBillDate('05/15/2026');
    expect(billDate?.toISOString()).toBe('2026-05-15T00:00:00.000Z');
  });

  it('maps bill dates to month buckets', () => {
    const billDate = parseBillDate('2026-05-15');
    expect(billDateToMonth(billDate!).toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('prefers amountDue over currentCharges', () => {
    expect(parseInvoiceAmount({ billDate: '2026-05-15', amountDue: 132.27, currentCharges: 100 })).toBe(
      132.27
    );
  });

  it('converts invoices to monthly bill amounts', () => {
    const monthlyBills = invoicesToMonthlyBills(MOCK_CHAMPION_INVOICES);

    expect(monthlyBills).toHaveLength(3);
    expect(monthlyBills[0]).toMatchObject({
      amount: 97.11,
      month: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(monthlyBills[2]).toMatchObject({
      amount: 132.27,
      month: new Date('2026-05-01T00:00:00.000Z'),
    });
  });
});
