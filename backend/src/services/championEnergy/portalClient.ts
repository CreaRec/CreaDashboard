import { createLogger } from '../../lib/logger';
import { getAccessToken } from './auth';
import {
  CHAMPION_APIM_BASE_URL,
  ChampionApiError,
  MIN_REQUEST_INTERVAL_MS,
  SESSION_TTL_MS,
  type ChampionAccount,
  type ChampionBillingSnapshot,
  type ChampionConfig,
  type ChampionInvoice,
} from './types';

const log = createLogger('champion-portal');

type FetchFn = typeof fetch;

interface ChampionAccountsResponse {
  accountSummaries?: Array<{
    id?: string;
    accountNumber?: string;
    rmAccountNumber?: string;
    accountId?: string;
  }>;
  accounts?: Array<{
    id?: string;
    accountId?: string;
    accountNumber?: string;
    rmAccountNumber?: string;
  }>;
}

interface ChampionAccountDetailsResponse {
  invoices?: ChampionInvoice[];
}

export class PortalClient {
  private authenticatedAt = 0;
  private lastRequestAt = 0;

  constructor(
    private readonly config: ChampionConfig,
    private readonly fetchImpl: FetchFn = fetch
  ) {}

  private async rateLimit(): Promise<void> {
    const interval = this.config.requestIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < interval) {
      await new Promise((resolve) => setTimeout(resolve, interval - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async apiRequest<T>(path: string): Promise<T> {
    await this.rateLimit();
    const accessToken = await getAccessToken(this.config, this.fetchImpl);
    const url = `${CHAMPION_APIM_BASE_URL}${path}`;

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      this.authenticatedAt = 0;
      throw new ChampionApiError('Champion session expired', response.status);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new ChampionApiError(
        `Champion API ${path} failed with status ${response.status}: ${body}`,
        response.status
      );
    }

    return (await response.json()) as T;
  }

  private async authenticateIfNeeded(): Promise<void> {
    if (this.authenticatedAt > 0 && Date.now() < this.authenticatedAt + SESSION_TTL_MS) {
      return;
    }

    await getAccessToken(this.config, this.fetchImpl);
    this.authenticatedAt = Date.now();
    log.debug('Champion authentication succeeded');
  }

  async getAccounts(): Promise<ChampionAccount[]> {
    await this.authenticateIfNeeded();
    const data = await this.apiRequest<ChampionAccountsResponse>(
      '/api/Account/getAccounts?source=RM'
    );

    const rawAccounts = data.accountSummaries ?? data.accounts ?? [];
    const accounts = rawAccounts
      .map((account) => ({
        accountId: (account.id ?? account.accountId)?.trim() ?? '',
        rmAccountNumber: (account.accountNumber ?? account.rmAccountNumber)?.trim() ?? '',
      }))
      .filter((account) => account.accountId);

    if (accounts.length === 0) {
      throw new ChampionApiError('Champion getAccounts returned no accounts');
    }

    return accounts;
  }

  async getAccountDetails(accountId: string): Promise<ChampionInvoice[]> {
    await this.authenticateIfNeeded();
    const data = await this.apiRequest<ChampionAccountDetailsResponse>(
      `/api/Account/getAccountDetails?id=${encodeURIComponent(accountId)}&source=RM`
    );

    return data.invoices ?? [];
  }

  async resolveAccount(accounts: ChampionAccount[]): Promise<ChampionAccount> {
    if (this.config.accountNumber) {
      const configured = accounts.find(
        (account) => account.rmAccountNumber === this.config.accountNumber
      );
      if (!configured) {
        throw new ChampionApiError(
          `Configured CHAMPION_ACCOUNT_NUMBER ${this.config.accountNumber} was not found`
        );
      }
      return configured;
    }

    if (accounts.length === 1) {
      return accounts[0];
    }

    throw new ChampionApiError(
      'Multiple Champion accounts found; set CHAMPION_ACCOUNT_NUMBER to select one'
    );
  }

  async fetchBillingSnapshot(): Promise<ChampionBillingSnapshot> {
    const accounts = await this.getAccounts();
    const account = await this.resolveAccount(accounts);
    const invoices = await this.getAccountDetails(account.accountId);

    return {
      accountId: account.accountId,
      rmAccountNumber: account.rmAccountNumber,
      invoices,
    };
  }
}

export function createPortalClient(config: ChampionConfig, fetchImpl: FetchFn = fetch): PortalClient {
  return new PortalClient(config, fetchImpl);
}
