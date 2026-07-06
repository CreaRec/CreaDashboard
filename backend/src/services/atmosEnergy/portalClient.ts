import { createLogger } from '../../lib/logger';
import {
  extractFormTokens,
  hasLoginPageIndicators,
  hasSessionErrorIndicators,
  mergeMonthlyAndBilling,
  parseBillingHistoryFromHtml,
  parseMonthlyXls,
} from './transform';
import {
  ATMOS_AUTH_PATH,
  ATMOS_BASE_URL,
  ATMOS_BILLING_PATH,
  ATMOS_LOGIN_PATH,
  ATMOS_MONTHLY_DOWNLOAD_PATH,
  ATMOS_USAGE_HISTORY_PATH,
  ATMOS_USAGE_LANDING_PATH,
  AtmosApiError,
  AtmosAuthError,
  MIN_REQUEST_INTERVAL_MS,
  SESSION_TTL_MS,
  type AtmosConfig,
  type AtmosUsageSnapshot,
} from './types';

const log = createLogger('atmos-portal');

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

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

export class PortalClient {
  private readonly cookies = new Map<string, string>();
  private authenticatedAt = 0;
  private lastRequestAt = 0;
  private readonly userAgent = buildUserAgent();

  constructor(
    private readonly config: AtmosConfig,
    private readonly fetchImpl: FetchFn = fetch
  ) {}

  private get requestIntervalMs(): number {
    return this.config.requestIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
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

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.requestIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.requestIntervalMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private verifyResponseUrl(url: string, allowLogin = false): void {
    const lower = url.toLowerCase();

    if (!allowLogin && (lower.includes('login.html') || lower.includes('authenticate.html'))) {
      throw new AtmosAuthError('Session expired or redirected to login');
    }

    if (lower.includes('successerrormessage.html')) {
      throw new AtmosAuthError('Atmos Energy portal returned an error page');
    }
  }

  private verifyHtmlContent(content: string, allowLogin = false): void {
    if (!content) {
      return;
    }

    const snippet = content.slice(0, 50_000).toLowerCase();

    if (!allowLogin && hasLoginPageIndicators(snippet)) {
      throw new AtmosAuthError('Portal returned a login page instead of expected data');
    }

    if (hasSessionErrorIndicators(snippet)) {
      throw new AtmosAuthError('Atmos Energy portal returned a session error');
    }
  }

  private async request(
    path: string,
    init: RequestInit & { referer?: string; allowLogin?: boolean; maxRedirects?: number } = {}
  ): Promise<Response> {
    const { referer, allowLogin = false, maxRedirects = 5, ...fetchInit } = init;
    let currentPath = path.startsWith('http') ? path : `${ATMOS_BASE_URL}${path}`;
    let redirects = 0;

    while (true) {
      await this.rateLimit();

      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(fetchInit.headers as Record<string, string> | undefined),
      };

      const cookieHeader = this.cookieHeader();
      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }

      if (referer) {
        headers.Referer = referer.startsWith('http') ? referer : `${ATMOS_BASE_URL}${referer}`;
      }

      const response = await this.fetchImpl(currentPath, {
        ...fetchInit,
        headers,
        redirect: 'manual',
      });

      this.storeCookies(response);

      if (isRedirect(response.status) && redirects < maxRedirects) {
        const location = response.headers.get('location');
        if (!location) {
          return response;
        }

        currentPath = location.startsWith('http')
          ? location
          : `${ATMOS_BASE_URL}${location.startsWith('/') ? '' : '/'}${location}`;
        redirects += 1;
        this.verifyResponseUrl(currentPath, allowLogin);
        continue;
      }

      this.verifyResponseUrl(response.url || currentPath, allowLogin);
      return response;
    }
  }

  private async checkSession(): Promise<boolean> {
    try {
      const response = await this.request(ATMOS_USAGE_LANDING_PATH, { method: 'GET' });
      const html = await response.text();
      this.verifyHtmlContent(html);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async authenticateIfNeeded(): Promise<void> {
    if (this.authenticatedAt > 0 && Date.now() < this.authenticatedAt + SESSION_TTL_MS) {
      const valid = await this.checkSession();
      if (valid) {
        log.debug('Using cached Atmos session');
        return;
      }
    }

    await this.authenticate();
    this.authenticatedAt = Date.now();
  }

  async authenticate(): Promise<void> {
    log.debug('Authenticating with Atmos Energy');
    this.cookies.clear();

    const loginResponse = await this.request(ATMOS_LOGIN_PATH, {
      method: 'GET',
      allowLogin: true,
    });
    const loginHtml = await loginResponse.text();
    this.verifyHtmlContent(loginHtml, true);

    const tokens = extractFormTokens(loginHtml);
    const body = new URLSearchParams({
      ...tokens,
      username: this.config.username,
      password: this.config.password,
      'button.Login': 'Login',
    });

    const authResponse = await this.request(ATMOS_AUTH_PATH, {
      method: 'POST',
      allowLogin: true,
      referer: ATMOS_LOGIN_PATH,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: ATMOS_BASE_URL,
      },
      body: body.toString(),
    });

    const authHtml = await authResponse.text();
    this.verifyHtmlContent(authHtml, true);

    if (authResponse.status === 401 || authResponse.status === 403) {
      throw new AtmosAuthError();
    }

    if (!authResponse.ok && authResponse.status >= 400) {
      throw new AtmosApiError(`Login failed with status ${authResponse.status}`, authResponse.status);
    }

    const landingResponse = await this.request(ATMOS_USAGE_LANDING_PATH, { method: 'GET' });
    const landingHtml = await landingResponse.text();
    this.verifyHtmlContent(landingHtml);

    if (!landingResponse.ok) {
      throw new AtmosApiError(
        `Usage landing failed with status ${landingResponse.status}`,
        landingResponse.status
      );
    }

    log.debug('Atmos Energy authentication succeeded');
  }

  async fetchMonthlyUsageXls(): Promise<ArrayBuffer> {
    await this.authenticateIfNeeded();

    const response = await this.request(ATMOS_MONTHLY_DOWNLOAD_PATH, {
      method: 'GET',
      referer: ATMOS_USAGE_HISTORY_PATH,
    });

    if (!response.ok) {
      throw new AtmosApiError(
        `monthlyUsageDownload failed with status ${response.status}`,
        response.status
      );
    }

    const buffer = await response.arrayBuffer();
    const preview = new TextDecoder().decode(buffer.slice(0, 200));
    if (preview.toLowerCase().includes('<html') || preview.toLowerCase().includes('<!doctype')) {
      this.verifyHtmlContent(preview);
      throw new AtmosApiError('Monthly usage download returned HTML instead of XLS');
    }

    return buffer;
  }

  async fetchBillingHistoryHtml(): Promise<string> {
    await this.authenticateIfNeeded();

    const response = await this.request(ATMOS_BILLING_PATH, {
      method: 'GET',
      referer: ATMOS_BILLING_PATH,
    });

    if (!response.ok) {
      throw new AtmosApiError(
        `FinancialTransaction failed with status ${response.status}`,
        response.status
      );
    }

    const html = await response.text();
    this.verifyHtmlContent(html);
    return html;
  }

  async fetchUsageSnapshot(): Promise<AtmosUsageSnapshot> {
    await this.authenticateIfNeeded();

    const [monthlyBuffer, billingHtml] = await Promise.all([
      this.fetchMonthlyUsageXls(),
      this.fetchBillingHistoryHtml(),
    ]);

    return {
      monthlyReadings: parseMonthlyXls(monthlyBuffer),
      billingEntries: parseBillingHistoryFromHtml(billingHtml),
    };
  }

  getMergedMonthlyReadings(snapshot: AtmosUsageSnapshot) {
    return mergeMonthlyAndBilling(
      snapshot.monthlyReadings,
      snapshot.billingEntries,
      this.config.gasRatePerCcf
    );
  }
}

export function createPortalClient(config: AtmosConfig, fetchImpl: FetchFn = fetch): PortalClient {
  return new PortalClient(config, fetchImpl);
}
