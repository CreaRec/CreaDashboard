export const SMT_BASE_URL = 'https://www.smartmetertexas.com';
export const SMT_API_BASE = `${SMT_BASE_URL}/api`;
export const SMT_AUTH_ENDPOINT = `${SMT_BASE_URL}/commonapi/user/authenticate`;

export const SMT_CLIENT_HEADERS: Record<string, string> = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  origin: SMT_BASE_URL,
  pragma: 'no-cache',
  referer: `${SMT_BASE_URL}/home`,
};

export const ODR_POLL_INTERVAL_MS = 15_000;
export const ODR_MAX_POLLS = 4;
export const TOKEN_TTL_MS = 14 * 60 * 1000;

export class SmtApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SmtApiError';
  }
}

export class SmtAuthError extends SmtApiError {
  constructor(message = 'Invalid Smart Meter Texas credentials') {
    super(message, 401);
    this.name = 'SmtAuthError';
  }
}

export interface SmtMeter {
  esiid: string;
  meterNumber: string;
  address: string;
}

export interface SmtMonthlyReading {
  month: Date;
  consumption: number;
}

export interface SmtIntervalReading {
  timestamp: Date;
  kwh: number;
}

export interface SmtCurrentReading {
  readingKwh: number;
  readAt: Date;
}

export interface SmtConfig {
  username: string;
  password: string;
  esiid?: string;
  electricityRatePerKwh?: number;
  syncIntervalMinutes: number;
}

export function getSmtConfig(): SmtConfig | null {
  const username = process.env.SMT_USERNAME?.trim();
  const password = process.env.SMT_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  const rateRaw = process.env.ELECTRICITY_RATE_PER_KWH?.trim();
  const electricityRatePerKwh = rateRaw ? Number(rateRaw) : undefined;

  return {
    username,
    password,
    esiid: process.env.SMT_ESIID?.trim() || undefined,
    electricityRatePerKwh:
      electricityRatePerKwh !== undefined && !Number.isNaN(electricityRatePerKwh)
        ? electricityRatePerKwh
        : undefined,
    syncIntervalMinutes: Number(process.env.SMT_SYNC_INTERVAL_MINUTES ?? 60),
  };
}

export function isSmtConfigured(): boolean {
  return getSmtConfig() !== null;
}
