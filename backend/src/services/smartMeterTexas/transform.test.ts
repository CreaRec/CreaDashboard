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
  parseIntervalResponse,
  parseMetersResponse,
  parseMonthlyResponse,
  parseOdrResponse,
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
    expect(monthly[0].month).toBe('Jan');
    expect(monthly[0].consumption).toBe(298);
  });

  it('parses legacy monthly response shape', () => {
    const monthly = parseMonthlyResponse({
      monthlyData: [{ date: '02/01/2026', reading: 298 }],
    });
    expect(monthly).toHaveLength(1);
    expect(monthly[0].month).toBe('Feb');
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

  it('ignores auth response shape without throwing', () => {
    expect(authResponse.token).toBe('mock-smt-token');
  });
});
