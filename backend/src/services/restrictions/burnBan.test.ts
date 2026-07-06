import { describe, expect, it } from 'vitest';
import {
  buildBurnBanLabel,
  parseTamuBurnBanResponse,
} from './burnBan';

describe('parseTamuBurnBanResponse', () => {
  it('returns active when county has burn ban', () => {
    const result = parseTamuBurnBanResponse(
      {
        features: [
          {
            attributes: {
              County: 'Travis',
              BurnBan: 'Yes',
            },
          },
        ],
      },
      'Travis'
    );

    expect(result).toEqual({ active: true });
  });

  it('returns inactive when county is not under burn ban', () => {
    const result = parseTamuBurnBanResponse(
      {
        features: [
          {
            attributes: {
              County: 'Travis',
              BurnBan: 'No',
            },
          },
        ],
      },
      'Travis'
    );

    expect(result).toEqual({ active: false });
  });
});

describe('buildBurnBanLabel', () => {
  it('returns Russian labels', () => {
    expect(buildBurnBanLabel(false)).toBe('Нет запрета');
    expect(buildBurnBanLabel(true)).toBe('Запрет действует');
  });
});
