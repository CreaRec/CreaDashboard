import {
  ODR_MAX_POLLS,
  ODR_POLL_INTERVAL_MS,
  SMT_API_BASE,
  SMT_AUTH_ENDPOINT,
  SMT_CLIENT_HEADERS,
  SmtApiError,
  SmtAuthError,
  TOKEN_TTL_MS,
  type SmtConfig,
  type SmtCurrentReading,
  type SmtIntervalReading,
  type SmtMeter,
  type SmtMonthlyReading,
} from './types';
import { createLogger } from '../../lib/logger';
import {
  formatSmtDate,
  parseIntervalResponse,
  parseMetersResponse,
  parseMonthlyResponse,
  parseOdrResponse,
} from './transform';

const log = createLogger('smt-portal');

type FetchFn = typeof fetch;

function buildUserAgent(): string {
  const build = Math.floor(Math.random() * 8998) + 1001;
  const rev = Math.floor(Math.random() * 987) + 12;
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.${build}.${rev} Safari/537.36`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PortalClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private readonly userAgent = buildUserAgent();

  constructor(
    private readonly config: SmtConfig,
    private readonly fetchImpl: FetchFn = fetch
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      ...SMT_CLIENT_HEADERS,
      'User-Agent': this.userAgent,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async authenticate(): Promise<void> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      log.debug('Using cached SMT auth token');
      return;
    }

    log.debug('Authenticating with Smart Meter Texas');
    const response = await this.fetchImpl(SMT_AUTH_ENDPOINT, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
        rememberMe: 'true',
      }),
    });

    if (response.status === 400 || response.status === 401) {
      throw new SmtAuthError();
    }

    if (!response.ok) {
      throw new SmtApiError(`Authentication failed with status ${response.status}`, response.status);
    }

    const payload = (await response.json()) as { token?: string };
    if (!payload.token) {
      throw new SmtApiError('Authentication response did not include a token');
    }

    this.token = payload.token;
    this.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    log.debug('SMT authentication succeeded');
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    await this.authenticate();

    log.debug('SMT API request', { path });
    const response = await this.fetchImpl(`${SMT_API_BASE}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      log.debug('SMT token expired, re-authenticating', { path });
      this.token = null;
      this.tokenExpiresAt = 0;
      await this.authenticate();

      const retryResponse = await this.fetchImpl(`${SMT_API_BASE}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (!retryResponse.ok) {
        throw new SmtApiError(`Request failed with status ${retryResponse.status}`, retryResponse.status);
      }

      return (await retryResponse.json()) as T;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      log.warn('SMT API request failed', {
        path,
        status: response.status,
        errorBody: errorBody.slice(0, 500) || undefined,
      });
      throw new SmtApiError(`Request failed with status ${response.status}`, response.status);
    }

    log.debug('SMT API request succeeded', { path, status: response.status });
    return (await response.json()) as T;
  }

  async fetchMeters(): Promise<SmtMeter[]> {
    const payload = await this.request<unknown>('/meter', { esiid: '*' });
    return parseMetersResponse(payload);
  }

  async resolveMeter(): Promise<SmtMeter> {
    if (this.config.esiid) {
      log.debug('Resolving configured ESIID', { esiid: this.config.esiid });
      const meters = await this.fetchMeters();
      const matched = meters.find((meter) => meter.esiid === this.config.esiid);
      if (matched) {
        log.debug('Configured ESIID matched portal meter');
        return matched;
      }

      log.debug('Configured ESIID not found in portal, using fallback meter metadata');
      return {
        esiid: this.config.esiid,
        meterNumber: '',
        address: '',
      };
    }

    const meters = await this.fetchMeters();
    if (meters.length === 0) {
      throw new SmtApiError('No meters found for Smart Meter Texas account');
    }

    log.debug('Using first portal meter', { esiid: meters[0].esiid });
    return meters[0];
  }

  async fetchMonthly(
    esiid: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SmtMonthlyReading[]> {
    const end = endDate ?? new Date();
    const start = startDate ?? new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

    const payload = await this.request<unknown>('/usage/monthly', {
      esiid,
      startDate: formatSmtDate(start),
      endDate: formatSmtDate(end),
    });
    return parseMonthlyResponse(payload);
  }

  async fetchIntervals(
    esiid: string,
    startDate: Date,
    endDate: Date
  ): Promise<SmtIntervalReading[]> {
    const payload = await this.request<unknown>('/usage/interval', {
      esiid,
      startDate: formatSmtDate(startDate),
      endDate: formatSmtDate(endDate),
    });

    return parseIntervalResponse(payload);
  }

  async fetchCurrentReading(meter: SmtMeter): Promise<SmtCurrentReading> {
    if (!meter.meterNumber) {
      throw new SmtApiError('Meter number is required for on-demand reads');
    }

    await this.request<unknown>('/ondemandread', {
      ESIID: meter.esiid,
      MeterNumber: meter.meterNumber,
    });

    log.debug('On-demand read requested, polling for result', {
      esiid: meter.esiid,
      maxPolls: ODR_MAX_POLLS,
    });

    for (let attempt = 0; attempt < ODR_MAX_POLLS; attempt += 1) {
      if (attempt > 0) {
        await sleep(ODR_POLL_INTERVAL_MS);
      }

      const payload = await this.request<unknown>('/usage/latestodrread', {
        ESIID: meter.esiid,
      });

      const reading = parseOdrResponse(payload);
      if (reading) {
        log.debug('On-demand read completed', {
          attempt: attempt + 1,
          readingKwh: reading.readingKwh,
        });
        return reading;
      }

      log.debug('On-demand read pending', { attempt: attempt + 1 });
    }

    log.warn('On-demand read timed out', { esiid: meter.esiid, polls: ODR_MAX_POLLS });
    throw new SmtApiError('On-demand meter read did not complete in time');
  }
}

export function createPortalClient(
  config: SmtConfig,
  fetchImpl: FetchFn = fetch
): PortalClient {
  return new PortalClient(config, fetchImpl);
}
