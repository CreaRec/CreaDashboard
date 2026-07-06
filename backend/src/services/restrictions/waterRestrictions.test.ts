import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractStructured } from '../../lib/openai/structured';
import { isOpenAiConfigured } from '../../lib/openai/client';
import {
  collectWaterRestrictionsSourceText,
  extractHcmsUserToken,
  extractWaterStageFromText,
  formatEmergencyAlertsText,
  htmlToText,
} from './waterRestrictions';
import { parseWaterStageResult } from './schemas';

vi.mock('../../lib/openai/structured', () => ({
  extractStructured: vi.fn(),
}));

vi.mock('../../lib/openai/client', () => ({
  isOpenAiConfigured: vi.fn().mockReturnValue(true),
}));

describe('htmlToText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToText('<h1>Stage 3</h1><p>Emergency restrictions</p>')).toBe(
      'Stage 3 Emergency restrictions'
    );
  });
});

describe('extractHcmsUserToken', () => {
  it('extracts bearer token from page config', () => {
    expect(
      extractHcmsUserToken('userToken:"Bearer test-token",other:true')
    ).toBe('Bearer test-token');
  });
});

describe('formatEmergencyAlertsText', () => {
  it('prioritizes water-restrictions alert', () => {
    const text = formatEmergencyAlertsText([
      {
        slug: 'other-water-update',
        data: {
          Title: { en: 'Older Water Update' },
          Details: { en: '<p>Stage 2 restrictions</p>' },
        },
      },
      {
        slug: 'water-restrictions',
        data: {
          Title: { en: 'Water Restrictions' },
          Details: {
            en: '<p>The City moved to modified Stage 1 water conservation measures.</p>',
          },
        },
      },
    ]);

    expect(text).toContain('Water Restrictions');
    expect(text).toContain('modified Stage 1');
    expect(text.indexOf('Water Restrictions')).toBeLessThan(text.indexOf('Older Water Update'));
  });
});

describe('collectWaterRestrictionsSourceText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('combines HCMS emergency alerts with page text', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          'userToken:"Bearer test-token" <h1>Current Water Restrictions</h1>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              slug: 'water-restrictions',
              data: {
                Title: { en: 'Water Restrictions' },
                Details: {
                  en: '<p>The City moved to modified Stage 1 water conservation measures.</p>',
                },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<title>Water update</title>',
      });

    const text = await collectWaterRestrictionsSourceText(
      'https://example.com/restrictions',
      fetchImpl as unknown as typeof fetch
    );

    expect(text).toContain('modified Stage 1');
    expect(text).toContain('Current Water Restrictions');
    expect(text).toContain('Water update');
  });
});

describe('extractWaterStageFromText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOpenAiConfigured).mockReturnValue(true);
  });

  it('returns unknown for empty content', async () => {
    const result = await extractWaterStageFromText('   ');
    expect(result).toEqual({ stage: 'unknown', stageLabel: 'Unknown' });
    expect(extractStructured).not.toHaveBeenCalled();
  });

  it('delegates extraction to OpenAI client', async () => {
    vi.mocked(extractStructured).mockResolvedValue({
      stage: 'modified_stage_1',
      stageLabel: 'Modified Stage 1',
    });

    const result = await extractWaterStageFromText('Modified Stage 1 restrictions');

    expect(result).toEqual({
      stage: 'modified_stage_1',
      stageLabel: 'Modified Stage 1',
    });
    expect(extractStructured).toHaveBeenCalled();
  });
});

describe('parseWaterStageResult', () => {
  it('falls back to unknown for invalid payloads', () => {
    expect(parseWaterStageResult(null)).toEqual({
      stage: 'unknown',
      stageLabel: 'Unknown',
    });
  });
});
