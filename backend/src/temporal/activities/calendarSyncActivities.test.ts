import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/realtime', () => ({
  broadcastDashboardUpdate: vi.fn(),
}));

vi.mock('../../services/appleCalendar/types', () => ({
  isAppleCalendarConfigured: vi.fn(),
}));

vi.mock('../../services/appleCalendar/sync', () => ({
  syncCalendarEvents: vi.fn(),
  logCalendarSyncResult: vi.fn(),
}));

import { SmtSyncStatus } from '@prisma/client';
import { broadcastDashboardUpdate } from '../../lib/realtime';
import { isAppleCalendarConfigured } from '../../services/appleCalendar/types';
import { logCalendarSyncResult, syncCalendarEvents } from '../../services/appleCalendar/sync';
import {
  checkAppleCalendarConfigured,
  logCalendarSyncActivityResult,
  runCalendarSync,
} from './calendarSyncActivities';

describe('calendarSyncActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports configured state from service', async () => {
    vi.mocked(isAppleCalendarConfigured).mockReturnValue(true);

    await expect(checkAppleCalendarConfigured()).resolves.toBe(true);
  });

  it('runs sync and broadcasts dashboard update', async () => {
    vi.mocked(syncCalendarEvents).mockResolvedValue(2);

    await expect(runCalendarSync()).resolves.toBe(2);
    expect(broadcastDashboardUpdate).toHaveBeenCalled();
  });

  it('logs sync results through service', async () => {
    await logCalendarSyncActivityResult(SmtSyncStatus.success, 5);

    expect(logCalendarSyncResult).toHaveBeenCalledWith(SmtSyncStatus.success, 5, undefined);
  });
});
