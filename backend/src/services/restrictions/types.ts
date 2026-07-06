export const DEFAULT_WATER_RESTRICTIONS_URL =
  'https://www.pflugervilletx.gov/current-water-restrictions';

export const DEFAULT_BURN_BAN_COUNTIES = ['Travis'];

export const TAMU_BURN_BAN_API_URL =
  'https://tfsgis.tfs.tamu.edu/arcgis/rest/services/BurnBan/BurnBan/MapServer/0/query';

export const NEWS_FLASH_RSS_URL =
  'http://www.pflugervilletx.gov/support/newsflash.xml';

export const HCMS_API_BASE_URL =
  'https://content.civicplus.com/api/content/tx-pflugerville';

export const HCMS_EMERGENCY_ALERTS_URL = `${HCMS_API_BASE_URL}/emergencyalerts`;

export type WaterStage =
  | 'none'
  | 'stage_1'
  | 'modified_stage_1'
  | 'stage_2'
  | 'stage_3'
  | 'unknown';

export interface WaterStageResult {
  stage: WaterStage;
  stageLabel: string;
}

export interface BurnBanResult {
  active: boolean;
  county: string;
  label: string;
}

export interface RestrictionsConfig {
  burnBanCounties: string[];
  waterRestrictionsUrl: string;
  syncIntervalMinutes: number;
}

export function getRestrictionsConfig(): RestrictionsConfig {
  const counties =
    process.env.BURN_BAN_COUNTIES?.split(',')
      .map((county) => county.trim())
      .filter(Boolean) ?? DEFAULT_BURN_BAN_COUNTIES;

  const waterRestrictionsUrl =
    process.env.WATER_RESTRICTIONS_URL?.trim() || DEFAULT_WATER_RESTRICTIONS_URL;

  const syncIntervalMinutes = Math.max(
    Number.parseInt(process.env.RESTRICTIONS_SYNC_INTERVAL_MINUTES ?? '1440', 10) || 1440,
    1
  );

  return {
    burnBanCounties: counties.length > 0 ? counties : DEFAULT_BURN_BAN_COUNTIES,
    waterRestrictionsUrl,
    syncIntervalMinutes,
  };
}
