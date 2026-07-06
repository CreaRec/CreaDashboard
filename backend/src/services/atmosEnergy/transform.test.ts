import { describe, expect, it } from 'vitest';
import {
  billingHistoryHtml,
  buildMonthlyXlsBuffer,
} from '../../mocks/atmosResponses';
import {
  estimateCost,
  mergeMonthlyAndBilling,
  parseBillingHistoryFromHtml,
  parseMonthlyXls,
} from './transform';

describe('atmosEnergy transform', () => {
  it('parses monthly XLS rows', () => {
    const buffer = buildMonthlyXlsBuffer();
    const readings = parseMonthlyXls(buffer);

    expect(readings).toHaveLength(3);
    expect(readings[0].consumption).toBe(42.5);
    expect(readings[0].month.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(readings[2].consumption).toBe(9.8);
  });

  it('parses billing history HTML', () => {
    const entries = parseBillingHistoryFromHtml(billingHistoryHtml);

    expect(entries).toHaveLength(3);
    expect(entries[0].amountUsd).toBe(87.42);
    expect(entries[2].amountUsd).toBe(38.95);
  });

  it('merges monthly consumption with billing amounts', () => {
    const buffer = buildMonthlyXlsBuffer();
    const monthlyReadings = parseMonthlyXls(buffer);
    const billingEntries = parseBillingHistoryFromHtml(billingHistoryHtml);

    const merged = mergeMonthlyAndBilling(monthlyReadings, billingEntries);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ consumption: 42.5, cost: 87.42 });
    expect(merged[2]).toMatchObject({ consumption: 9.8, cost: 38.95 });
  });

  it('estimates cost when billing amount is missing', () => {
    const buffer = buildMonthlyXlsBuffer();
    const monthlyReadings = parseMonthlyXls(buffer);

    const merged = mergeMonthlyAndBilling(monthlyReadings, [], 1.25);

    expect(merged[0].cost).toBe(estimateCost(42.5, 1.25));
    expect(merged[2].cost).toBe(estimateCost(9.8, 1.25));
  });
});
