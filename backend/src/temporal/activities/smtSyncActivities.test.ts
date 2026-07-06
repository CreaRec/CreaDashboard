import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UtilityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { syncMonthlyReadings } from './smtSyncActivities';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    utilityReading: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../services/smartMeterTexas/portalClient', () => ({
  createPortalClient: vi.fn(),
}));

vi.mock('../../services/smartMeterTexas/types', () => ({
  getSmtConfig: vi.fn(() => ({
    username: 'user',
    password: 'pass',
    esiid: 'esiid-1',
    electricityRatePerKwh: 0.12,
  })),
  isSmtConfigured: vi.fn(() => true),
}));

vi.mock('../../services/championEnergy/types', () => ({
  isChampionConfigured: vi.fn(() => false),
}));

import { createPortalClient } from '../../services/smartMeterTexas/portalClient';
import { isChampionConfigured } from '../../services/championEnergy/types';

describe('syncMonthlyReadings', () => {
  const month = new Date(Date.UTC(2026, 4, 1));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPortalClient).mockReturnValue({
      fetchMonthly: vi.fn().mockResolvedValue([{ month, consumption: 512 }]),
    } as never);
    vi.mocked(prisma.utilityReading.upsert).mockResolvedValue({} as never);
  });

  it('stores estimated cost when Champion is not configured', async () => {
    vi.mocked(isChampionConfigured).mockReturnValue(false);

    await syncMonthlyReadings('esiid-1');

    expect(prisma.utilityReading.upsert).toHaveBeenCalledWith({
      where: {
        utilityType_month: {
          utilityType: UtilityType.electricity,
          month,
        },
      },
      update: {
        consumption: 512,
        cost: 61.44,
      },
      create: {
        utilityType: UtilityType.electricity,
        month,
        consumption: 512,
        cost: 61.44,
      },
    });
  });

  it('preserves bill costs when Champion is configured', async () => {
    vi.mocked(isChampionConfigured).mockReturnValue(true);

    await syncMonthlyReadings('esiid-1');

    expect(prisma.utilityReading.upsert).toHaveBeenCalledWith({
      where: {
        utilityType_month: {
          utilityType: UtilityType.electricity,
          month,
        },
      },
      update: {
        consumption: 512,
      },
      create: {
        utilityType: UtilityType.electricity,
        month,
        consumption: 512,
        cost: 0,
      },
    });
  });
});
