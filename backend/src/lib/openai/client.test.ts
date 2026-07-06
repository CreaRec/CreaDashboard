import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractStructured } from './structured';
import {
  createChatCompletion,
  getOpenAiConfig,
  isOpenAiConfigured,
} from './client';

vi.mock('./client', async () => {
  const actual = await vi.importActual<typeof import('./client')>('./client');
  return {
    ...actual,
    createChatCompletion: vi.fn(),
  };
});

describe('openai config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when API key is missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAiConfigured()).toBe(false);
    expect(getOpenAiConfig()).toBeNull();
  });

  it('returns config with defaults', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_BASE_URL;

    expect(isOpenAiConfigured()).toBe(true);
    expect(getOpenAiConfig()).toEqual({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    });
  });
});

describe('extractStructured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses structured JSON from chat completion', async () => {
    vi.mocked(createChatCompletion).mockResolvedValue(
      JSON.stringify({
        stage: 'modified_stage_1',
        stageLabel: 'Modified Stage 1',
      })
    );

    const result = await extractStructured<{ stage: string; stageLabel: string }>({
      systemPrompt: 'Extract stage',
      userContent: 'Modified Stage 1 restrictions are in effect',
      schema: {
        name: 'WaterStage',
        schema: {
          type: 'object',
          properties: {
            stage: { type: 'string' },
            stageLabel: { type: 'string' },
          },
          required: ['stage', 'stageLabel'],
          additionalProperties: false,
        },
      },
    });

    expect(result).toEqual({
      stage: 'modified_stage_1',
      stageLabel: 'Modified Stage 1',
    });
    expect(createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: expect.objectContaining({
          type: 'json_schema',
        }),
      })
    );
  });
});
