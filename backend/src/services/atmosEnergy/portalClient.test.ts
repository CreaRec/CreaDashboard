import { describe, expect, it } from 'vitest';
import {
  billingHistoryHtml,
  buildMonthlyXlsBuffer,
  loginPageHtml,
  usageLandingHtml,
} from '../../mocks/atmosResponses';
import { createPortalClient } from './portalClient';
import type { AtmosConfig } from './types';

const config: AtmosConfig = {
  username: 'user@example.com',
  password: 'secret',
  syncIntervalMinutes: 1440,
  requestIntervalMs: 0,
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

describe('atmosEnergy portalClient', () => {
  it('authenticates and fetches usage snapshot', async () => {
    const monthlyXls = buildMonthlyXlsBuffer();

    const client = createPortalClient(
      config,
      mockFetch({
        'login.html': () =>
          new Response(loginPageHtml, {
            status: 200,
            headers: { 'set-cookie': 'JSESSIONID=abc123; Path=/' },
          }),
        'authenticate.html': () =>
          new Response('', {
            status: 302,
            headers: {
              location: '/accountcenter/usagehistory/UsageHistoryLanding.html',
              'set-cookie': 'JSESSIONID=abc123; Path=/',
            },
          }),
        'UsageHistoryLanding.html': () =>
          new Response(usageLandingHtml, {
            status: 200,
            headers: { 'set-cookie': 'JSESSIONID=abc123; Path=/' },
          }),
        'monthlyUsageDownload.html': () =>
          new Response(monthlyXls, {
            status: 200,
            headers: { 'content-type': 'application/vnd.ms-excel' },
          }),
        'FinancialTransaction.html': () =>
          new Response(billingHistoryHtml, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      })
    );

    const snapshot = await client.fetchUsageSnapshot();

    expect(snapshot.monthlyReadings).toHaveLength(3);
    expect(snapshot.billingEntries).toHaveLength(3);

    const merged = client.getMergedMonthlyReadings(snapshot);
    expect(merged[0].cost).toBe(87.42);
  });
});
