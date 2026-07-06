import { createLogger } from '../../lib/logger';
import { BurnBanResult, TAMU_BURN_BAN_API_URL } from './types';

const log = createLogger('burn-ban');

interface TamuBurnBanFeature {
  attributes?: {
    County?: string;
    BurnBan?: string;
    StartDate?: number | null;
  };
}

interface TamuBurnBanResponse {
  features?: TamuBurnBanFeature[];
}

export function parseTamuBurnBanResponse(
  payload: TamuBurnBanResponse,
  county: string
): { active: boolean } {
  const feature = payload.features?.find(
    (entry) => entry.attributes?.County?.toLowerCase() === county.toLowerCase()
  );

  if (!feature) {
    return { active: false };
  }

  return { active: feature.attributes?.BurnBan === 'Yes' };
}

export function buildBurnBanLabel(active: boolean): string {
  return active ? 'Запрет действует' : 'Нет запрета';
}

export async function fetchBurnBanStatus(
  counties: string[],
  fetchImpl: typeof fetch = fetch
): Promise<BurnBanResult> {
  const primaryCounty = counties[0] ?? 'Travis';
  const whereClause = counties.map((county) => `County='${county.replace(/'/g, "''")}'`).join(' OR ');
  const url = `${TAMU_BURN_BAN_API_URL}?where=${encodeURIComponent(whereClause)}&outFields=County,BurnBan,StartDate&f=json`;

  log.debug('Fetching burn ban status', { counties, url });

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Burn ban API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TamuBurnBanResponse;
  const active = counties.some((county) => parseTamuBurnBanResponse(payload, county).active);

  return {
    active,
    county: primaryCounty,
    label: buildBurnBanLabel(active),
  };
}
