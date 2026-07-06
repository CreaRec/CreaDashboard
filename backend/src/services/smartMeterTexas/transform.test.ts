import { describe, expect, it } from 'vitest';
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
  formatMonthLabel,
  parseIntervalResponse,
  parseMetersResponse,
  parseMonthlyResponse,
  parseMonthKey,
  parseOdrResponse,
  sortMonthlyReadings,
} from './transform';

describe('transform', () => {
  it('parses meters response', () => {
    const meters = parseMetersResponse(metersResponse);
    expect(meters).toHaveLength(1);
    expect(meters[0].esiid).toBe('10443720012345678');
    expect(meters[0].meterNumber).toBe('M1234567');
  });

  it('parses monthly response', () => {
    const monthly = parseMonthlyResponse(monthlyResponse);
    expect(monthly).toHaveLength(6);
    expect(monthly[0].month).toBe('2026-01');
    expect(monthly[0].consumption).toBe(298);
  });

  it('parses legacy monthly response shape', () => {
    const monthly = parseMonthlyResponse({
      monthlyData: [{ date: '02/01/2026', reading: 298 }],
    });
    expect(monthly).toHaveLength(1);
    expect(monthly[0].month).toBe('2026-02');
    expect(monthly[0].consumption).toBe(298);
  });

  it('parses interval response', () => {
    const intervals = parseIntervalResponse(intervalResponse);
    expect(intervals).toHaveLength(4);
    expect(intervals[0].kwh).toBe(0.155);
    expect(intervals[0].timestamp).toBeInstanceOf(Date);
    expect(intervals[0].timestamp.getFullYear()).toBe(2026);
    expect(intervals[0].timestamp.getMonth()).toBe(6);
    expect(intervals[0].timestamp.getDate()).toBe(4);
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
    expect(intervals[0].timestamp.getHours()).toBe(0);
    expect(intervals[0].timestamp.getMinutes()).toBe(0);
    expect(intervals[1].timestamp.getMinutes()).toBe(15);
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

  it('sorts monthly readings chronologically', () => {
    const sorted = sortMonthlyReadings([
      { month: 'Apr', consumption: 1 },
      { month: '2026-07', consumption: 2 },
      { month: 'Jan', consumption: 3 },
    ]);

    expect(sorted.map((reading) => reading.month)).toEqual(['Jan', 'Apr', '2026-07']);
  });

  it('formats month keys for chart labels', () => {
    expect(formatMonthLabel('2026-04')).toBe('Apr');
    expect(formatMonthLabel('Apr')).toBe('Apr');
  });

  it('parses month keys from slash and ISO dates', () => {
    expect(parseMonthKey('04/30/2026')).toBe('2026-04');
    expect(parseMonthKey('2026-07-04')).toBe('2026-07');
  });

  it('ignores auth response shape without throwing', () => {
    expect(authResponse.token).toBe('mock-smt-token');
  });
});
