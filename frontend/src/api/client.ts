import { createLogger } from '../lib/logger';

const log = createLogger('api');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  log.debug('API request', { path, method: options?.method ?? 'GET' });
  const response = await fetch(path, options);

  if (!response.ok) {
    log.error('API request failed', { path, status: response.status });
    throw new Error(`API error: ${response.status}`);
  }

  log.debug('API request succeeded', { path, status: response.status });
  return response.json() as Promise<T>;
}

export default apiFetch;
