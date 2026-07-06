import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  authResponse,
  intervalResponse,
  metersResponse,
  monthlyResponse,
  odrCompletedResponse,
  odrPendingResponse,
} from '../../mocks/smtResponses';
import {
  estimateCost,
  formatUtilityMonth,
  parseIntervalResponse,
  parseMetersResponse,
  parseMonthlyResponse,
  parseMonthDate,
  parseOdrResponse,
} from './transform';
import { getLocalDateParts } from '../../lib/timezone';

describe('transform', () => {
  beforeEach(() => {
    process.env.APP_TIMEZONE = 'America/Chicago';
  });

  afterEach(() => {
    delete process.env.APP_TIMEZONE;
  });

  it('parses meters response', () => {
    const meters = parseMetersResponse(metersResponse);
    expect(meters).toHaveLength(1);
    expect(meters[0].esiid).toBe('10443720012345678');
    expect(meters[0].meterNumber).toBe('M1234567');
  });

  it('parses monthly response', () => {
    const monthly = parseMonthlyResponse(monthlyResponse);
    expect(monthly).toHaveLength(6);
    expect(monthly[0].month).toEqual(new Date(Date.UTC(2026, 0, 1)));
    expect(monthly[0].consumption).toBe(298);
  });

  it('parses legacy monthly response shape', () => {
    const monthly = parseMonthlyResponse({
      monthlyData: [{ date: '02/01/2026', reading: 298 }],
    });
    expect(monthly).toHaveLength(1);
    expect(monthly[0].month).toEqual(new Date(Date.UTC(2026, 1, 1)));
    expect(monthly[0].consumption).toBe(298);
  });

  it('parses interval response', () => {
    const intervals = parseIntervalResponse(intervalResponse);
    expect(intervals).toHaveLength(4);
    expect(intervals[0].kwh).toBe(0.155);
    expect(intervals[0].timestamp).toBeInstanceOf(Date);
    expect(getLocalDateParts(intervals[0].timestamp)).toMatchObject({
      year: 2026,
      month: 7,
      day: 4,
      hour: 0,
      minute: 0,
    });
  });

  it('parses interval response with ISO dates', () => {
    const intervals = parseIntervalResponse({
      intervaldata: [
        { date: '2026-07-04', starttime: ' 12:00 am', consumption: 0.385 },
        { date: '2026-07-04', starttime: ' 12:15 am', consumption: 0.178 },
      ],
    });
    expect(intervals).toHaveLength(2);
    expect(intervals[0].kwh).toBe(0.385);
    expect(getLocalDateParts(intervals[0].timestamp)).toMatchObject({
      hour: 0,
      minute: 0,
    });
    expect(getLocalDateParts(intervals[1].timestamp)).toMatchObject({
      minute: 15,
    });
  });

  it('parses completed ODR response', () => {
    const reading = parseOdrResponse(odrCompletedResponse);
    expect(reading?.readingKwh).toBe(67856.565);
    expect(reading?.readAt).toBeInstanceOf(Date);
  });

  it('returns null for pending ODR response', () => {
    expect(parseOdrResponse(odrPendingResponse)).toBeNull();
  });

  it('estimates cost from kWh rate', () => {
    expect(estimateCost(100, 0.12)).toBe(12);
    expect(estimateCost(100)).toBe(0);
  });

  it('parses month dates as first day of month in UTC', () => {
    expect(parseMonthDate('04/30/2026')).toEqual(new Date(Date.UTC(2026, 3, 1)));
    expect(parseMonthDate('2026-07-04')).toEqual(new Date(Date.UTC(2026, 6, 1)));
    expect(parseMonthDate('2026-07')).toEqual(new Date(Date.UTC(2026, 6, 1)));
  });

  it('formats utility months from PostgreSQL DATE values', () => {
    expect(formatUtilityMonth(new Date(Date.UTC(2026, 3, 1)))).toBe('2026-04-01');
    expect(formatUtilityMonth('2026-04')).toBe('2026-04-01');
  });

  it('ignores auth response shape without throwing', () => {
    expect(authResponse.token).toBe('mock-smt-token');
  });
});
