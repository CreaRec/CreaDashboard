import { describe, expect, it } from 'vitest';
import {
  getIntegrationDotClass,
  getIntegrationStatusTitle,
} from './integrationStatus';

describe('getIntegrationDotClass', () => {
  it('returns gray when integration is not configured', () => {
    expect(getIntegrationDotClass(false, 'success')).toBe('bg-gray-300');
  });

  it('returns red when the latest sync failed', () => {
    expect(getIntegrationDotClass(true, 'error')).toBe('bg-red-500');
  });

  it('returns green when the latest sync succeeded', () => {
    expect(getIntegrationDotClass(true, 'success')).toBe('bg-emerald-500');
  });

  it('returns amber when the latest sync was skipped', () => {
    expect(getIntegrationDotClass(true, 'skipped')).toBe('bg-amber-400');
  });
});

describe('getIntegrationStatusTitle', () => {
  it('returns the sync error message when integration failed', () => {
    expect(getIntegrationStatusTitle(true, 'error', 'Portal timeout')).toBe(
      'Portal timeout'
    );
  });

  it('returns a success message when sync is healthy', () => {
    expect(getIntegrationStatusTitle(true, 'success', null)).toBe(
      'Синхронизация работает'
    );
  });
});
