import { createLogger } from '../../lib/logger';
import {
  extractLoginRefreshToken,
  hasLoginErrors,
  parseAccountNumberFromViewBill,
  parseBillingHistoryFromViewBill,
  parseWeatherConsumptionChart,
} from './transform';
import {
  SESSION_TTL_MS,
  WATERSMART_CLIENT_HEADERS,
  WATERSMART_LOGIN_PATH,
  WATERSMART_TRACK_USAGE_PATH,
  WATERSMART_VIEW_BILL_PATH,
  WATERSMART_WEATHER_CHART_PATH,
  WaterSmartApiError,
  WaterSmartAuthError,
  getWaterSmartBaseUrl,
  type WaterSmartAccount,
  type WaterSmartBillingEntry,
  type WaterSmartConfig,
  type WaterSmartDailyReading,
  type WaterSmartUsageSnapshot,
} from './types';

const log = createLogger('watersmart-portal');

type FetchFn = typeof fetch;

function buildUserAgent(): string {
  const build = Math.floor(Math.random() * 8998) + 1001;
  const rev = Math.floor(Math.random() * 987) + 12;
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.${build}.${rev} Safari/537.36`;
}

function parseSetCookie(header: string): { name: string; value: string } | null {
  const part = header.split(';')[0]?.trim();
  if (!part) {
    return null;
  }

  const separator = part.indexOf('=');
  if (separator <= 0) {
    return null;
  }

  return {
    name: part.slice(0, separator),
    value: part.slice(separator + 1),
  };
}

export class PortalClient {
  private readonly baseUrl: string;
  private readonly cookies = new Map<string, string>();
  private authenticatedAt = 0;
  private readonly userAgent = buildUserAgent();

  constructor(
    private readonly config: WaterSmartConfig,
    private readonly fetchImpl: FetchFn = fetch
  ) {
    this.baseUrl = getWaterSmartBaseUrl(config.host);
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  private storeCookies(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookieHeaders =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : (() => {
            const value = response.headers.get('set-cookie');
            return value ? [value] : [];
          })();

    for (const header of setCookieHeaders) {
      const parsed = parseSetCookie(header);
      if (parsed) {
        this.cookies.set(parsed.name, parsed.value);
      }
    }
  }

  private async request(
    path: string,
    init: RequestInit & { referer?: string } = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(init.headers as Record<string, string> | undefined),
    };

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    if (init.referer) {
      headers.Referer = init.referer;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      redirect: 'manual',
    });

    this.storeCookies(response);
    return response;
  }

  private async authenticateIfNeeded(): Promise<void> {
    if (this.authenticatedAt > 0 && Date.now() < this.authenticatedAt + SESSION_TTL_MS) {
      log.debug('Using cached WaterSmart session');
      return;
    }

    await this.authenticate();
    this.authenticatedAt = Date.now();
  }

  private async postLogin(path: string, body: URLSearchParams): Promise<string> {
    const response = await this.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}${WATERSMART_LOGIN_PATH}`,
      },
      body: body.toString(),
    });

    const html = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new WaterSmartAuthError();
    }

    if (hasLoginErrors(html)) {
      throw new WaterSmartAuthError();
    }

    if (response.status >= 400) {
      throw new WaterSmartApiError(`Login failed with status ${response.status}`, response.status);
    }

    return html;
  }

  async authenticate(): Promise<void> {
    log.debug('Authenticating with WaterSmart');
    const loginPage = await this.request(WATERSMART_LOGIN_PATH, { method: 'GET' });
    const loginHtml = await loginPage.text();

    const body = new URLSearchParams({
      token: '',
      email: this.config.email,
      password: this.config.password,
    });

    let responseHtml = await this.postLogin(WATERSMART_LOGIN_PATH, body);

    if (hasLoginErrors(responseHtml)) {
      const refreshToken = extractLoginRefreshToken(loginHtml);
      if (refreshToken) {
        const retryBody = new URLSearchParams({
          token: '',
          loginRefreshToken: refreshToken,
          email: this.config.email,
          password: this.config.password,
        });
        responseHtml = await this.postLogin(`${WATERSMART_LOGIN_PATH}?forceEmail=1`, retryBody);
      }
    }

    if (hasLoginErrors(responseHtml)) {
      throw new WaterSmartAuthError();
    }

    log.debug('WaterSmart authentication succeeded');
  }

  async fetchDailyReadings(): Promise<WaterSmartDailyReading[]> {
    await this.authenticateIfNeeded();

    const response = await this.request(WATERSMART_WEATHER_CHART_PATH, {
      method: 'GET',
      headers: WATERSMART_CLIENT_HEADERS,
      referer: `${this.baseUrl}${WATERSMART_TRACK_USAGE_PATH}`,
    });

    if (!response.ok) {
      throw new WaterSmartApiError(
        `weatherConsumptionChart failed with status ${response.status}`,
        response.status
      );
    }

    const payload = await response.json();
    return parseWeatherConsumptionChart(payload);
  }

  async fetchBillingHistory(): Promise<WaterSmartBillingEntry[]> {
    await this.authenticateIfNeeded();

    const response = await this.request(WATERSMART_VIEW_BILL_PATH, {
      method: 'GET',
      referer: `${this.baseUrl}${WATERSMART_VIEW_BILL_PATH}`,
    });

    if (!response.ok) {
      throw new WaterSmartApiError(
        `viewBill failed with status ${response.status}`,
        response.status
      );
    }

    const html = await response.text();
    return parseBillingHistoryFromViewBill(html);
  }

  async resolveAccount(): Promise<WaterSmartAccount> {
    await this.authenticateIfNeeded();

    const response = await this.request(WATERSMART_VIEW_BILL_PATH, {
      method: 'GET',
      referer: `${this.baseUrl}${WATERSMART_VIEW_BILL_PATH}`,
    });

    if (!response.ok) {
      throw new WaterSmartApiError(
        `viewBill failed with status ${response.status}`,
        response.status
      );
    }

    const html = await response.text();
    const accountNumber = parseAccountNumberFromViewBill(html);
    if (!accountNumber) {
      throw new WaterSmartApiError('Account number not found on billing page');
    }

    return { accountNumber };
  }

  async fetchUsageSnapshot(): Promise<WaterSmartUsageSnapshot> {
    await this.authenticateIfNeeded();

    const [dailyResponse, billingResponse] = await Promise.all([
      this.request(WATERSMART_WEATHER_CHART_PATH, {
        method: 'GET',
        headers: WATERSMART_CLIENT_HEADERS,
        referer: `${this.baseUrl}${WATERSMART_TRACK_USAGE_PATH}`,
      }),
      this.request(WATERSMART_VIEW_BILL_PATH, {
        method: 'GET',
        referer: `${this.baseUrl}${WATERSMART_VIEW_BILL_PATH}`,
      }),
    ]);

    if (!dailyResponse.ok) {
      throw new WaterSmartApiError(
        `weatherConsumptionChart failed with status ${dailyResponse.status}`,
        dailyResponse.status
      );
    }

    if (!billingResponse.ok) {
      throw new WaterSmartApiError(
        `viewBill failed with status ${billingResponse.status}`,
        billingResponse.status
      );
    }

    const [dailyPayload, billingHtml] = await Promise.all([
      dailyResponse.json(),
      billingResponse.text(),
    ]);

    return {
      dailyReadings: parseWeatherConsumptionChart(dailyPayload),
      billingEntries: parseBillingHistoryFromViewBill(billingHtml),
    };
  }
}

export function createPortalClient(
  config: WaterSmartConfig,
  fetchImpl: FetchFn = fetch
): PortalClient {
  return new PortalClient(config, fetchImpl);
}
