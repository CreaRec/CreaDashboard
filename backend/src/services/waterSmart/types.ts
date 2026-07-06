export const WATERSMART_LOGIN_PATH = '/index.php/welcome/login';
export const WATERSMART_TRACK_USAGE_PATH = '/index.php/trackUsage';
export const WATERSMART_VIEW_BILL_PATH = '/index.php/billing/viewBill';
export const WATERSMART_WEATHER_CHART_PATH =
  '/index.php/rest/v1/Chart/weatherConsumptionChart?module=portal&commentary=full';

export const SESSION_TTL_MS = 10 * 60 * 1000;

export const WATERSMART_CLIENT_HEADERS: Record<string, string> = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
};

export class WaterSmartApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'WaterSmartApiError';
  }
}

export class WaterSmartAuthError extends WaterSmartApiError {
  constructor(message = 'Invalid WaterSmart credentials') {
    super(message, 401);
    this.name = 'WaterSmartAuthError';
  }
}

export interface WaterSmartDailyReading {
  date: Date;
  gallons: number;
}

export interface WaterSmartMonthlyReading {
  month: Date;
  consumption: number;
  cost: number;
}

export interface WaterSmartBillingEntry {
  billDate: Date;
  amountUsd: number;
  billId: string;
}

export interface WaterSmartAccount {
  accountNumber: string;
}

export interface WaterSmartUsageSnapshot {
  dailyReadings: WaterSmartDailyReading[];
  billingEntries: WaterSmartBillingEntry[];
}

export interface WaterSmartConfig {
  host: string;
  email: string;
  password: string;
  waterRatePerGallon?: number;
  syncIntervalMinutes: number;
}

export function getWaterSmartBaseUrl(host: string): string {
  return `https://${host}.watersmart.com`;
}

export function getWaterSmartConfig(): WaterSmartConfig | null {
  const host = process.env.WATERSMART_HOST?.trim();
  const email = process.env.WATERSMART_EMAIL?.trim();
  const password = process.env.WATERSMART_PASSWORD?.trim();

  if (!host || !email || !password) {
    return null;
  }

  const rateRaw = process.env.WATER_RATE_PER_GALLON?.trim();
  const waterRatePerGallon = rateRaw ? Number(rateRaw) : undefined;

  return {
    host,
    email,
    password,
    waterRatePerGallon:
      waterRatePerGallon !== undefined && !Number.isNaN(waterRatePerGallon)
        ? waterRatePerGallon
        : undefined,
    syncIntervalMinutes: Number(process.env.WATERSMART_SYNC_INTERVAL_MINUTES ?? 360),
  };
}

export function isWaterSmartConfigured(): boolean {
  return getWaterSmartConfig() !== null;
}
