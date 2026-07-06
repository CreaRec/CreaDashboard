import { describe, expect, it } from 'vitest';
import {
  loginErrorHtml,
  loginPageHtml,
  loginSuccessHtml,
  viewBillHtml,
  weatherConsumptionChartResponse,
} from '../../mocks/waterSmartResponses';
import { createPortalClient } from './portalClient';
import type { WaterSmartConfig } from './types';

const config: WaterSmartConfig = {
  host: 'pflugervilletx',
  email: 'user@example.com',
  password: 'secret',
  syncIntervalMinutes: 360,
};

function mockFetch(handlers: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;

    for (const [pattern, handler] of Object.entries(handlers)) {
      if (key.includes(pattern) || url.includes(pattern)) {
        return handler();
      }
    }

    throw new Error(`Unhandled fetch: ${key}`);
  };
}

describe('waterSmart portalClient', () => {
  it('authenticates and fetches usage snapshot', async () => {
    const client = createPortalClient(
      config,
      mockFetch({
        'GET https://pflugervilletx.watersmart.com/index.php/welcome/login': () =>
          new Response(loginPageHtml, {
            status: 200,
            headers: { 'set-cookie': 'PHPSESSID=abc123; Path=/' },
          }),
        'POST https://pflugervilletx.watersmart.com/index.php/welcome/login': () =>
          new Response(loginSuccessHtml, {
            status: 200,
            headers: { 'set-cookie': 'PHPSESSID=abc123; Path=/' },
          }),
        weatherConsumptionChart: () =>
          new Response(JSON.stringify(weatherConsumptionChartResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        viewBill: () =>
          new Response(viewBillHtml, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      })
    );

    const snapshot = await client.fetchUsageSnapshot();

    expect(snapshot.dailyReadings.length).toBeGreaterThan(0);
    expect(snapshot.billingEntries).toHaveLength(3);

    const account = await client.resolveAccount();
    expect(account.accountNumber).toBe('1353310-153414');
  });

  it('throws on login errors', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (method === 'GET' && url.includes('welcome/login')) {
        return new Response(loginPageHtml, {
          status: 200,
          headers: { 'set-cookie': 'PHPSESSID=abc123; Path=/' },
        });
      }

      if (method === 'POST' && url.includes('welcome/login')) {
        return new Response(loginErrorHtml, { status: 200 });
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    };

    const client = createPortalClient(config, fetchImpl);

    await expect(client.fetchDailyReadings()).rejects.toThrow('Invalid WaterSmart credentials');
  });
});
