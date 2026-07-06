export const ATMOS_BASE_URL = 'https://www.atmosenergy.com';
export const ATMOS_LOGIN_PATH = '/accountcenter/logon/login.html';
export const ATMOS_AUTH_PATH = '/accountcenter/logon/authenticate.html';
export const ATMOS_USAGE_LANDING_PATH = '/accountcenter/usagehistory/UsageHistoryLanding.html';
export const ATMOS_MONTHLY_DOWNLOAD_PATH = '/accountcenter/usagehistory/monthlyUsageDownload.html';
export const ATMOS_USAGE_HISTORY_PATH = '/accountcenter/usagehistory/usagehistory.html';
export const ATMOS_BILLING_PATH = '/accountcenter/finance/FinancialTransaction.html?activeTab=2';

export const SESSION_TTL_MS = 10 * 60 * 1000;
export const MIN_REQUEST_INTERVAL_MS = 2000;

export class AtmosApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AtmosApiError';
  }
}

export class AtmosAuthError extends AtmosApiError {
  constructor(message = 'Invalid Atmos Energy credentials') {
    super(message, 401);
    this.name = 'AtmosAuthError';
  }
}

export class AtmosParseError extends AtmosApiError {
  constructor(message: string) {
    super(message);
    this.name = 'AtmosParseError';
  }
}

export interface AtmosMonthlyReading {
  month: Date;
  consumption: number;
  chargeDate: Date;
  billingMonth?: string;
}

export interface AtmosBillingEntry {
  billDate: Date;
  amountUsd: number;
}

export interface AtmosMergedMonthlyReading {
  month: Date;
  consumption: number;
  cost: number;
}

export interface AtmosUsageSnapshot {
  monthlyReadings: AtmosMonthlyReading[];
  billingEntries: AtmosBillingEntry[];
}

export interface AtmosConfig {
  username: string;
  password: string;
  gasRatePerCcf?: number;
  syncIntervalMinutes: number;
  requestIntervalMs?: number;
}

export function getAtmosConfig(): AtmosConfig | null {
  const username = process.env.ATMOS_USERNAME?.trim();
  const password = process.env.ATMOS_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  const rateRaw = process.env.GAS_RATE_PER_CCF?.trim();
  const gasRatePerCcf = rateRaw ? Number(rateRaw) : undefined;

  return {
    username,
    password,
    gasRatePerCcf:
      gasRatePerCcf !== undefined && !Number.isNaN(gasRatePerCcf) ? gasRatePerCcf : undefined,
    syncIntervalMinutes: Number(process.env.ATMOS_SYNC_INTERVAL_MINUTES ?? 1440),
  };
}

export function isAtmosConfigured(): boolean {
  return getAtmosConfig() !== null;
}
