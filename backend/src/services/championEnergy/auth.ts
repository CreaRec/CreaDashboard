import { createHash, randomBytes } from 'crypto';
import { createLogger } from '../../lib/logger';
import {
  CHAMPION_CLIENT_ID,
  CHAMPION_IDENTITY_BASE_URL,
  CHAMPION_REDIRECT_URI,
  ChampionAuthError,
  getChampionB2CBaseUrl,
  type ChampionConfig,
} from './types';

const log = createLogger('champion-auth');

type FetchFn = typeof fetch;

export interface ChampionTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface ParsedForm {
  action: string;
  fields: Record<string, string>;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function resolveUrl(current: string, location: string | null): string | null {
  if (!location) {
    return null;
  }

  if (location.startsWith('http')) {
    return location;
  }

  return new URL(location, new URL(current).origin).toString();
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

function storeCookies(response: Response, jar: Map<string, string>): void {
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
      jar.set(parsed.name, parsed.value);
    }
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function extractInputValue(html: string, name: string): string {
  const pattern = new RegExp(
    `<input[^>]*name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*value="([^"]*)"[^>]*>`,
    'i'
  );
  const altPattern = new RegExp(
    `<input[^>]*value="([^"]*)"[^>]*name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
    'i'
  );

  const match = html.match(pattern) ?? html.match(altPattern);
  return decodeHtmlEntities(match?.[1] ?? '');
}

function extractForm(html: string): ParsedForm | null {
  const match = html.match(/<form[^>]*action=['"]([^'"]*)['"][^>]*>([\s\S]*?)<\/form>/i);
  if (!match) {
    return null;
  }

  const fields: Record<string, string> = {};
  const formBody = match[2];

  for (const inputMatch of formBody.matchAll(
    /<input[^>]*name=['"]([^'"]*)['"][^>]*value=['"]([^'"]*)['"][^>]*>/gi
  )) {
    fields[inputMatch[1]] = decodeHtmlEntities(inputMatch[2]);
  }

  for (const inputMatch of formBody.matchAll(
    /<input[^>]*value=['"]([^'"]*)['"][^>]*name=['"]([^'"]*)['"][^>]*>/gi
  )) {
    fields[inputMatch[2]] = decodeHtmlEntities(inputMatch[1]);
  }

  return {
    action: decodeHtmlEntities(match[1]),
    fields,
  };
}

function isFinalAuthorizationRedirect(location: string): boolean {
  try {
    const redirectUrl = new URL(location);
    return (
      redirectUrl.origin === new URL(CHAMPION_REDIRECT_URI).origin &&
      redirectUrl.searchParams.has('code')
    );
  } catch {
    return location.includes('championenergyservices.com') && location.includes('code=');
  }
}

function extractAuthorizationCodeFromLocation(location: string): string {
  return new URL(location).searchParams.get('code') ?? '';
}

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function buildUserAgent(): string {
  const build = Math.floor(Math.random() * 8998) + 1001;
  const rev = Math.floor(Math.random() * 987) + 12;
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.${build}.${rev} Safari/537.36`;
}

async function request(
  fetchImpl: FetchFn,
  url: string,
  jar: Map<string, string>,
  userAgent: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    ...(init.headers as Record<string, string> | undefined),
  };

  const cookies = cookieHeader(jar);
  if (cookies) {
    headers.Cookie = cookies;
  }

  const response = await fetchImpl(url, {
    ...init,
    headers,
    redirect: 'manual',
  });

  storeCookies(response, jar);
  return response;
}

async function exchangeAuthorizationCode(
  fetchImpl: FetchFn,
  code: string,
  codeVerifier: string
): Promise<ChampionTokenSet> {
  const tokenUrl = `${getChampionB2CBaseUrl()}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CHAMPION_CLIENT_ID,
    code,
    redirect_uri: CHAMPION_REDIRECT_URI,
    code_verifier: codeVerifier,
    scope: `openid offline_access ${CHAMPION_CLIENT_ID}`,
  });

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new ChampionAuthError(`Token exchange failed with status ${response.status}: ${payload}`);
  }

  return parseTokenResponse(payload);
}

function parseTokenResponse(payload: string): ChampionTokenSet {
  const data = JSON.parse(payload) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new ChampionAuthError(
      data.error_description ?? data.error ?? 'Champion token response missing access_token'
    );
  }

  const expiresIn = data.expires_in ?? 3600;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

async function followUntilAuthorizationCode(
  fetchImpl: FetchFn,
  startUrl: string,
  jar: Map<string, string>,
  userAgent: string
): Promise<string> {
  let url: string | null = startUrl;

  for (let step = 0; step < 20 && url; step += 1) {
    const response = await request(fetchImpl, url, jar, userAgent);
    const location = response.headers.get('location');

    if (location && isFinalAuthorizationRedirect(location)) {
      return extractAuthorizationCodeFromLocation(location);
    }

    if (response.status >= 300 && response.status < 400) {
      url = resolveUrl(url, location);
      continue;
    }

    const html = await response.text();
    const form = extractForm(html);
    if (!form) {
      if (html.includes('access_denied')) {
        throw new ChampionAuthError('Champion login was denied by the identity provider');
      }
      throw new ChampionAuthError('Unexpected Champion login response without authorization form');
    }

    if (form.fields.error) {
      throw new ChampionAuthError(`Champion login failed: ${form.fields.error}`);
    }

    const action: string | null = form.action.startsWith('http')
      ? form.action
      : resolveUrl(url, form.action);
    if (!action) {
      throw new ChampionAuthError('Champion login form is missing action URL');
    }

    const postResponse = await request(fetchImpl, action, jar, userAgent, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: new URL(action).origin,
        Referer: url,
      },
      body: new URLSearchParams(form.fields).toString(),
    });

    const postLocation = postResponse.headers.get('location');
    if (postLocation && isFinalAuthorizationRedirect(postLocation)) {
      return extractAuthorizationCodeFromLocation(postLocation);
    }

    if (postResponse.status >= 300 && postResponse.status < 400) {
      url = resolveUrl(action, postLocation);
      continue;
    }

    const postHtml = await postResponse.text();
    const nestedForm = extractForm(postHtml);
    if (nestedForm) {
      if (nestedForm.fields.error) {
        throw new ChampionAuthError(`Champion login failed: ${nestedForm.fields.error}`);
      }

      const nestedAction: string | null = nestedForm.action.startsWith('http')
        ? nestedForm.action
        : resolveUrl(action, nestedForm.action);
      if (!nestedAction) {
        throw new ChampionAuthError('Champion nested login form is missing action URL');
      }

      const nestedResponse = await request(fetchImpl, nestedAction, jar, userAgent, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: new URL(nestedAction).origin,
          Referer: action,
        },
        body: new URLSearchParams(nestedForm.fields).toString(),
      });

      const nestedLocation = nestedResponse.headers.get('location');
      if (nestedLocation && isFinalAuthorizationRedirect(nestedLocation)) {
        return extractAuthorizationCodeFromLocation(nestedLocation);
      }

      url = nestedLocation ? resolveUrl(nestedAction, nestedLocation) : null;
      continue;
    }

    url = postLocation ? resolveUrl(action, postLocation) : null;
  }

  throw new ChampionAuthError('Timed out waiting for Champion authorization code');
}

export async function loginWithPassword(
  config: ChampionConfig,
  fetchImpl: FetchFn = fetch
): Promise<ChampionTokenSet> {
  const userAgent = buildUserAgent();
  const jar = new Map<string, string>();
  const { verifier, challenge } = createPkcePair();
  const authorizeParams = new URLSearchParams({
    client_id: CHAMPION_CLIENT_ID,
    response_type: 'code',
    redirect_uri: CHAMPION_REDIRECT_URI,
    response_mode: 'query',
    scope: `openid offline_access ${CHAMPION_CLIENT_ID}`,
    state: randomBytes(16).toString('hex'),
    nonce: randomBytes(16).toString('hex'),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  let url = `${getChampionB2CBaseUrl()}/oauth2/v2.0/authorize?${authorizeParams.toString()}`;
  let loginPageUrl = '';
  let loginHtml = '';

  for (let step = 0; step < 10; step += 1) {
    const response = await request(fetchImpl, url, jar, userAgent);
    if (response.status >= 300 && response.status < 400) {
      url = resolveUrl(url, response.headers.get('location')) ?? '';
      continue;
    }

    loginPageUrl = url;
    loginHtml = await response.text();
    break;
  }

  if (!loginHtml.includes('Input.Username')) {
    throw new ChampionAuthError('Champion login page was not reached');
  }

  const loginBody = new URLSearchParams({
    'Input.ReturnUrl': extractInputValue(loginHtml, 'Input.ReturnUrl'),
    'Input.Username': config.username,
    'Input.Password': config.password,
    'Input.Button': 'login',
    __RequestVerificationToken: extractInputValue(loginHtml, '__RequestVerificationToken'),
  });

  const loginResponse = await request(fetchImpl, loginPageUrl, jar, userAgent, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: CHAMPION_IDENTITY_BASE_URL,
      Referer: loginPageUrl,
    },
    body: loginBody.toString(),
  });

  const nextUrl = resolveUrl(loginPageUrl, loginResponse.headers.get('location'));
  if (!nextUrl) {
    throw new ChampionAuthError('Champion login did not redirect after submitting credentials');
  }

  log.debug('Champion identity login submitted, completing OAuth redirect chain');
  const code = await followUntilAuthorizationCode(fetchImpl, nextUrl, jar, userAgent);
  if (!code) {
    throw new ChampionAuthError('Champion authorization code was not returned');
  }

  return exchangeAuthorizationCode(fetchImpl, code, verifier);
}

export async function refreshAccessToken(
  refreshToken: string,
  fetchImpl: FetchFn = fetch
): Promise<ChampionTokenSet> {
  const tokenUrl = `${getChampionB2CBaseUrl()}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CHAMPION_CLIENT_ID,
    refresh_token: refreshToken,
    scope: `openid offline_access ${CHAMPION_CLIENT_ID}`,
  });

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new ChampionAuthError(`Token refresh failed with status ${response.status}: ${payload}`);
  }

  return parseTokenResponse(payload);
}

let cachedTokens: ChampionTokenSet | null = null;

export function clearTokenCache(): void {
  cachedTokens = null;
}

export async function getAccessToken(
  config: ChampionConfig,
  fetchImpl: FetchFn = fetch
): Promise<string> {
  if (cachedTokens && Date.now() < cachedTokens.expiresAt - 60_000) {
    return cachedTokens.accessToken;
  }

  if (cachedTokens?.refreshToken) {
    try {
      cachedTokens = await refreshAccessToken(cachedTokens.refreshToken, fetchImpl);
      return cachedTokens.accessToken;
    } catch (error) {
      log.debug('Champion refresh token failed, performing password login', error);
      cachedTokens = null;
    }
  }

  cachedTokens = await loginWithPassword(config, fetchImpl);
  return cachedTokens.accessToken;
}
