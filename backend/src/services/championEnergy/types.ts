export const CHAMPION_CLIENT_ID = 'c8a5af8b-6567-4194-8064-d783e64e2b3f';
export const CHAMPION_TENANT_NAME = 'championprodb2c';
export const CHAMPION_B2C_POLICY = 'B2C_1A_signup_signin';
export const CHAMPION_REDIRECT_URI = 'https://www.championenergyservices.com';
export const CHAMPION_IDENTITY_BASE_URL = 'https://identity.championenergyservices.com';
export const CHAMPION_APIM_BASE_URL = 'https://apim.championenergyservices.com/Account/v2';

export const SESSION_TTL_MS = 10 * 60 * 1000;
export const MIN_REQUEST_INTERVAL_MS = 500;

export class ChampionApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ChampionApiError';
  }
}

export class ChampionAuthError extends ChampionApiError {
  constructor(message = 'Invalid Champion Energy credentials') {
    super(message, 401);
    this.name = 'ChampionAuthError';
  }
}

export interface ChampionConfig {
  username: string;
  password: string;
  accountNumber?: string;
  syncIntervalMinutes: number;
  requestIntervalMs?: number;
}

export interface ChampionAccount {
  accountId: string;
  rmAccountNumber: string;
}

export interface ChampionInvoice {
  billDate: string;
  amountDue: number;
  usageKwh?: number;
  currentCharges?: number;
  invoiceURL?: string;
}

export interface ChampionBillingSnapshot {
  accountId: string;
  rmAccountNumber: string;
  invoices: ChampionInvoice[];
}

export interface ChampionMonthlyBill {
  month: Date;
  amount: number;
}

export function getChampionB2CBaseUrl(): string {
  return `https://${CHAMPION_TENANT_NAME}.b2clogin.com/${CHAMPION_TENANT_NAME}.onmicrosoft.com/${CHAMPION_B2C_POLICY}`;
}

export function getChampionConfig(): ChampionConfig | null {
  const username = process.env.CHAMPION_USERNAME?.trim();
  const password = process.env.CHAMPION_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  const accountNumber = process.env.CHAMPION_ACCOUNT_NUMBER?.trim();

  return {
    username,
    password,
    accountNumber: accountNumber || undefined,
    syncIntervalMinutes: Number(process.env.CHAMPION_SYNC_INTERVAL_MINUTES ?? 1440),
  };
}

export function isChampionConfigured(): boolean {
  return getChampionConfig() !== null;
}
