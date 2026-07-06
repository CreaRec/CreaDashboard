import { describe, expect, it } from 'vitest';
import { parseLocalDate } from '../../lib/timezone';
import { viewBillHtml, weatherConsumptionChartResponse } from '../../mocks/waterSmartResponses';
import {
  aggregateMonthlyFromDaily,
  parseAccountNumberFromViewBill,
  parseBillingHistoryFromViewBill,
  parseWeatherConsumptionChart,
} from './transform';

describe('waterSmart transform', () => {
  it('parses daily readings from weatherConsumptionChart', () => {
    const readings = parseWeatherConsumptionChart(weatherConsumptionChartResponse);

    expect(readings).toHaveLength(9);
    expect(readings[8]).toEqual({
      date: parseLocalDate('2026-07-05'),
      gallons: 1275.2,
    });
  });

  it('parses billing history and account number from viewBill HTML', () => {
    const accountNumber = parseAccountNumberFromViewBill(viewBillHtml);
    const billing = parseBillingHistoryFromViewBill(viewBillHtml);

    expect(accountNumber).toBe('1353310-153414');
    expect(billing).toHaveLength(3);
    expect(billing[0].amountUsd).toBe(216.29);
    expect(billing[1].amountUsd).toBe(235.43);
  });

  it('aggregates monthly consumption from daily data and cost from billing', () => {
    const daily = parseWeatherConsumptionChart(weatherConsumptionChartResponse);
    const billing = parseBillingHistoryFromViewBill(viewBillHtml);
    const monthly = aggregateMonthlyFromDaily(daily, billing);

    const june = monthly.find((entry) => entry.month.toISOString().startsWith('2026-06'));
    const may = monthly.find((entry) => entry.month.toISOString().startsWith('2026-05'));

    expect(june?.consumption).toBeCloseTo(1379.4, 1);
    expect(june?.cost).toBe(216.29);
    expect(may?.cost).toBe(235.43);
  });

  it('uses rate fallback when billing cost is missing', () => {
    const daily = [{ date: new Date('2026-03-22T00:00:00.000Z'), gallons: 100 }];
    const monthly = aggregateMonthlyFromDaily(daily, [], 0.01);

    expect(monthly).toHaveLength(1);
    expect(monthly[0].consumption).toBe(100);
    expect(monthly[0].cost).toBe(1);
  });
});
