import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    electricityMeterSnapshot: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import { canRunOdrSync, ODR_MIN_INTERVAL_MS } from './odrRateLimit';

describe('odrRateLimit', () => {
  beforeEach(() => {
    vi.mocked(prisma.electricityMeterSnapshot.findUnique).mockReset();
  });

  it('allows first ODR sync when no snapshot exists', async () => {
    vi.mocked(prisma.electricityMeterSnapshot.findUnique).mockResolvedValue(null);
    await expect(canRunOdrSync('esiid-1', 1_000)).resolves.toBe(true);
  });

  it('blocks ODR sync within one hour', async () => {
    vi.mocked(prisma.electricityMeterSnapshot.findUnique).mockResolvedValue({
      id: 1,
      esiid: 'esiid-1',
      readingKwh: 100,
      readAt: new Date(10_000),
    });

    await expect(canRunOdrSync('esiid-1', 10_000 + 30 * 60 * 1000)).resolves.toBe(false);
  });

  it('allows ODR sync after one hour', async () => {
    vi.mocked(prisma.electricityMeterSnapshot.findUnique).mockResolvedValue({
      id: 1,
      esiid: 'esiid-1',
      readingKwh: 100,
      readAt: new Date(10_000),
    });

    await expect(
      canRunOdrSync('esiid-1', 10_000 + ODR_MIN_INTERVAL_MS)
    ).resolves.toBe(true);
  });
});
