import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    smtSyncLog: {
      findFirst: vi.fn(),
    },
    waterSyncLog: {
      findFirst: vi.fn(),
    },
    gasSyncLog: {
      findFirst: vi.fn(),
    },
    championSyncLog: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from './prisma';
import { broadcastDashboardUpdate, subscribeDashboardEvents } from './realtime';

describe('realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies subscribers on broadcast', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDashboardEvents(listener);

    broadcastDashboardUpdate();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDashboardEvents(listener);
    unsubscribe();

    broadcastDashboardUpdate();

    expect(listener).not.toHaveBeenCalled();
  });

  it('startSyncWatcher is importable with prisma mock', async () => {
    vi.mocked(prisma.smtSyncLog.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.waterSyncLog.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.gasSyncLog.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.championSyncLog.findFirst).mockResolvedValue(null);
    const { startSyncWatcher } = await import('./realtime');
    expect(typeof startSyncWatcher).toBe('function');
  });
});
