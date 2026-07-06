import type { JsonSchemaDefinition } from '../../lib/openai/types';
import { WaterStage, WaterStageResult } from './types';

export const waterStageJsonSchema: JsonSchemaDefinition = {
  name: 'WaterStage',
  schema: {
    type: 'object',
    properties: {
      stage: {
        type: 'string',
        enum: [
          'none',
          'stage_1',
          'modified_stage_1',
          'stage_2',
          'stage_3',
          'unknown',
        ],
      },
      stageLabel: {
        type: 'string',
      },
    },
    required: ['stage', 'stageLabel'],
    additionalProperties: false,
  },
};

const WATER_STAGES: WaterStage[] = [
  'none',
  'stage_1',
  'modified_stage_1',
  'stage_2',
  'stage_3',
  'unknown',
];

export function parseWaterStageResult(value: unknown): WaterStageResult {
  if (!value || typeof value !== 'object') {
    return { stage: 'unknown', stageLabel: 'Unknown' };
  }

  const record = value as Record<string, unknown>;
  const stage = WATER_STAGES.includes(record.stage as WaterStage)
    ? (record.stage as WaterStage)
    : 'unknown';
  const stageLabel =
    typeof record.stageLabel === 'string' && record.stageLabel.trim()
      ? record.stageLabel.trim()
      : 'Unknown';

  return { stage, stageLabel };
}
