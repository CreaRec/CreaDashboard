import { afterEach, describe, expect, it } from 'vitest';
import {
  canRunOdrSync,
  markOdrSync,
  resetOdrSyncState,
} from './odrRateLimit';

describe('odrRateLimit', () => {
  afterEach(() => {
    resetOdrSyncState();
  });

  it('allows first ODR sync immediately', () => {
    expect(canRunOdrSync(1_000)).toBe(true);
  });

  it('blocks ODR sync within one hour', () => {
    markOdrSync(10_000);
    expect(canRunOdrSync(10_000 + 30 * 60 * 1000)).toBe(false);
  });

  it('allows ODR sync after one hour', () => {
    markOdrSync(10_000);
    expect(canRunOdrSync(10_000 + 60 * 60 * 1000)).toBe(true);
  });
});
