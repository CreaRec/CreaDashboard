import { extractStructured } from '../../lib/openai/structured';
import { isOpenAiConfigured } from '../../lib/openai/client';
import { createLogger } from '../../lib/logger';
import { parseWaterStageResult, waterStageJsonSchema } from './schemas';
import {
  DEFAULT_WATER_RESTRICTIONS_URL,
  HCMS_EMERGENCY_ALERTS_URL,
  NEWS_FLASH_RSS_URL,
  WaterStageResult,
} from './types';

const log = createLogger('water-restrictions');

const WATER_STAGE_SYSTEM_PROMPT =
  'Extract only the current water restriction stage for Pflugerville, Texas from the provided page content. Return the canonical stage enum and a short human-readable stageLabel such as "Modified Stage 1" or "Stage 3". If the stage cannot be determined, use stage "unknown" and stageLabel "Unknown".';

interface HcmsEmergencyAlertItem {
  slug?: string;
  lastModified?: string;
  data?: {
    Title?: { en?: string };
    Details?: { en?: string };
  };
}

interface HcmsEmergencyAlertsResponse {
  items?: HcmsEmergencyAlertItem[];
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractHcmsUserToken(html: string): string | null {
  const match = html.match(/userToken:"(Bearer [^"]+)"/);
  return match?.[1] ?? null;
}

export function formatEmergencyAlertsText(items: HcmsEmergencyAlertItem[]): string {
  const waterAlerts = items.filter((item) => {
    const slug = item.slug?.toLowerCase() ?? '';
    const title = item.data?.Title?.en?.toLowerCase() ?? '';
    return slug.includes('water') || title.includes('water');
  });

  const ordered = [...waterAlerts].sort((left, right) => {
    if (left.slug === 'water-restrictions') {
      return -1;
    }
    if (right.slug === 'water-restrictions') {
      return 1;
    }

    const leftTime = left.lastModified ? Date.parse(left.lastModified) : 0;
    const rightTime = right.lastModified ? Date.parse(right.lastModified) : 0;
    return rightTime - leftTime;
  });

  return ordered
    .map((item) => {
      const title = item.data?.Title?.en?.trim() ?? '';
      const details = htmlToText(item.data?.Details?.en ?? '');
      return [title, details].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

async function fetchPageHtml(
  url: string,
  fetchImpl: typeof fetch
): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'CreaDashboard/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch water restrictions page: ${response.status}`);
  }

  return response.text();
}

async function fetchEmergencyAlertsText(
  token: string,
  fetchImpl: typeof fetch
): Promise<string> {
  try {
    const response = await fetchImpl(HCMS_EMERGENCY_ALERTS_URL, {
      headers: {
        Authorization: token,
        Accept: 'application/json',
        'User-Agent': 'CreaDashboard/1.0',
      },
    });

    if (!response.ok) {
      log.warn('Failed to fetch HCMS emergency alerts', { status: response.status });
      return '';
    }

    const payload = (await response.json()) as HcmsEmergencyAlertsResponse;
    return formatEmergencyAlertsText(payload.items ?? []);
  } catch (error) {
    log.warn('Failed to fetch HCMS emergency alerts', error);
    return '';
  }
}

async function fetchNewsFlashText(fetchImpl: typeof fetch): Promise<string> {
  try {
    const response = await fetchImpl(NEWS_FLASH_RSS_URL, {
      headers: {
        'User-Agent': 'CreaDashboard/1.0',
      },
    });

    if (!response.ok) {
      return '';
    }

    return htmlToText(await response.text());
  } catch (error) {
    log.warn('Failed to fetch news flash feed', error);
    return '';
  }
}

export async function collectWaterRestrictionsSourceText(
  url: string = DEFAULT_WATER_RESTRICTIONS_URL,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const html = await fetchPageHtml(url, fetchImpl);
  const pageText = htmlToText(html);
  const token = extractHcmsUserToken(html);
  const emergencyAlertsText = token ? await fetchEmergencyAlertsText(token, fetchImpl) : '';
  const newsFlashText = await fetchNewsFlashText(fetchImpl);

  const parts = [emergencyAlertsText, pageText, newsFlashText].filter((part) => part.length > 0);
  return parts.join('\n\n');
}

export async function extractWaterStageFromText(
  sourceText: string,
  fetchImpl?: typeof fetch
): Promise<WaterStageResult> {
  if (!sourceText.trim()) {
    return { stage: 'unknown', stageLabel: 'Unknown' };
  }

  if (!isOpenAiConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  return extractStructured({
    systemPrompt: WATER_STAGE_SYSTEM_PROMPT,
    userContent: sourceText,
    schema: waterStageJsonSchema,
    fetchImpl,
    parse: parseWaterStageResult,
  });
}

export async function fetchWaterRestrictionsStatus(
  url: string = DEFAULT_WATER_RESTRICTIONS_URL,
  fetchImpl: typeof fetch = fetch
): Promise<WaterStageResult> {
  log.debug('Fetching water restrictions status', { url });
  const sourceText = await collectWaterRestrictionsSourceText(url, fetchImpl);
  return extractWaterStageFromText(sourceText, fetchImpl);
}
