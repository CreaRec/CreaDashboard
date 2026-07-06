import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MOCK_CHAMPION_ACCOUNT_DETAILS_RESPONSE,
  MOCK_CHAMPION_ACCOUNTS_RESPONSE,
} from '../../mocks/championResponses';
import { createPortalClient } from './portalClient';
import type { ChampionConfig } from './types';

vi.mock('./auth', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
}));

const config: ChampionConfig = {
  username: 'CreaRec',
  password: 'secret',
  syncIntervalMinutes: 1440,
  requestIntervalMs: 0,
};

function mockFetch(handlers: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        return handler();
      }
    }

    throw new Error(`Unhandled fetch: ${url}`);
  };
}

describe('championEnergy portalClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches billing snapshot from APIM', async () => {
    const client = createPortalClient(
      config,
      mockFetch({
        getAccounts: () =>
          new Response(JSON.stringify(MOCK_CHAMPION_ACCOUNTS_RESPONSE), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        getAccountDetails: () =>
          new Response(JSON.stringify(MOCK_CHAMPION_ACCOUNT_DETAILS_RESPONSE), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      })
    );

    const snapshot = await client.fetchBillingSnapshot();

    expect(snapshot.rmAccountNumber).toBe('1218208');
    expect(snapshot.invoices).toHaveLength(3);
    expect(snapshot.invoices[0].amountDue).toBe(132.27);
  });

  it('requires CHAMPION_ACCOUNT_NUMBER when multiple accounts are returned', async () => {
    const client = createPortalClient(
      config,
      mockFetch({
        getAccounts: () =>
          new Response(
            JSON.stringify({
              accountSummaries: [
                { id: 'acc-1', accountNumber: '111' },
                { id: 'acc-2', accountNumber: '222' },
              ],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }
          ),
      })
    );

    await expect(client.fetchBillingSnapshot()).rejects.toThrow(
      'Multiple Champion accounts found'
    );
  });
});
