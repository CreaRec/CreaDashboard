import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authResponse,
  intervalResponse,
  metersResponse,
  monthlyResponse,
  odrCompletedResponse,
  odrPendingResponse,
} from '../../mocks/smtResponses';
import { localDateTimeToDate } from '../../lib/timezone';
import { SMT_API_BASE, SMT_AUTH_ENDPOINT } from './types';
import { createPortalClient } from './portalClient';

const config = {
  username: 'user@example.com',
  password: 'secret',
  syncIntervalMinutes: 60,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('portalClient', () => {
  beforeEach(() => {
    process.env.APP_TIMEZONE = 'America/Chicago';
  });

  afterEach(() => {
    delete process.env.APP_TIMEZONE;
    vi.restoreAllMocks();
  });

  it('authenticates and fetches meters', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === SMT_AUTH_ENDPOINT) {
        return jsonResponse(authResponse);
      }
      if (url === `${SMT_API_BASE}/meter`) {
        return jsonResponse(metersResponse);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = createPortalClient(config, fetchMock as typeof fetch);
    const meters = await client.fetchMeters();

    expect(meters).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries request after 401 with a fresh token', async () => {
    let meterCalls = 0;

    const fetchMock = vi.fn(async (url: string) => {
      if (url === SMT_AUTH_ENDPOINT) {
        return jsonResponse(authResponse);
      }
      if (url === `${SMT_API_BASE}/meter`) {
        meterCalls += 1;
        if (meterCalls === 1) {
          return jsonResponse({ error: 'expired' }, 401);
        }
        return jsonResponse(metersResponse);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = createPortalClient(config, fetchMock as typeof fetch);
    const meters = await client.fetchMeters();

    expect(meters).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('fetches monthly and interval data', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === SMT_AUTH_ENDPOINT) {
        return jsonResponse(authResponse);
      }
      if (url === `${SMT_API_BASE}/usage/monthly`) {
        return jsonResponse(monthlyResponse);
      }
      if (url === `${SMT_API_BASE}/usage/interval`) {
        return jsonResponse(intervalResponse);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = createPortalClient(config, fetchMock as typeof fetch);
    const monthly = await client.fetchMonthly(
      '10443720012345678',
      localDateTimeToDate(2026, 1, 1),
      localDateTimeToDate(2026, 7, 1)
    );
    const intervals = await client.fetchIntervals(
      '10443720012345678',
      localDateTimeToDate(2026, 7, 4),
      localDateTimeToDate(2026, 7, 4)
    );

    expect(monthly).toHaveLength(6);
    expect(intervals).toHaveLength(4);

    const monthlyCall = fetchMock.mock.calls.find(
      ([url]) => url === `${SMT_API_BASE}/usage/monthly`
    );
    expect(monthlyCall).toBeDefined();
    const monthlyBody = JSON.parse(String(monthlyCall?.[1]?.body));
    expect(monthlyBody).toEqual({
      esiid: '10443720012345678',
      startDate: '01/01/2026',
      endDate: '07/01/2026',
    });
  });

  it('polls on-demand read until completed', async () => {
    vi.useFakeTimers();
    let odrCalls = 0;

    const fetchMock = vi.fn(async (url: string) => {
      if (url === SMT_AUTH_ENDPOINT) {
        return jsonResponse(authResponse);
      }
      if (url === `${SMT_API_BASE}/ondemandread`) {
        return jsonResponse({ ok: true });
      }
      if (url === `${SMT_API_BASE}/usage/latestodrread`) {
        odrCalls += 1;
        return jsonResponse(odrCalls === 1 ? odrPendingResponse : odrCompletedResponse);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = createPortalClient(config, fetchMock as typeof fetch);
    const readingPromise = client.fetchCurrentReading({
      esiid: '10443720012345678',
      meterNumber: 'M1234567',
      address: '123 Main St',
    });

    await vi.runAllTimersAsync();
    const reading = await readingPromise;

    expect(reading.readingKwh).toBe(67856.565);
    expect(odrCalls).toBe(2);
    vi.useRealTimers();
  });
});
