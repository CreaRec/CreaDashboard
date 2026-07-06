import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtSyncStatus } from '@prisma/client';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    calendarSyncState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    calendarEvent: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    calendarSyncLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('./caldavClient', () => ({
  createAppleCalendarClient: vi.fn(),
  fetchCalendarEvents: vi.fn(),
  filterCalendarsByName: vi.fn(),
}));

import { prisma } from '../../lib/prisma';
import {
  createAppleCalendarClient,
  fetchCalendarEvents,
  filterCalendarsByName,
} from './caldavClient';
import {
  getAppleCalendarSyncStatus,
  logCalendarSyncResult,
  syncCalendarEvents,
} from './sync';

const TIMED_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
DTSTART:20260710T150000Z
DTEND:20260710T160000Z
SUMMARY:Team meeting
END:VEVENT
END:VCALENDAR`;

describe('getAppleCalendarSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APPLE_ID;
    delete process.env.APPLE_APP_PASSWORD;
    delete process.env.APPLE_CALENDAR_NAMES;
  });

  it('returns configured false when env is missing', async () => {
    vi.mocked(prisma.calendarSyncLog.findFirst).mockResolvedValue(null);

    const status = await getAppleCalendarSyncStatus();

    expect(status).toEqual({
      configured: false,
      lastSync: null,
      lastStatus: null,
      lastError: null,
      recordsCount: 0,
    });
  });
});

describe('syncCalendarEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APPLE_ID = 'user@icloud.com';
    process.env.APPLE_APP_PASSWORD = 'app-password';
    process.env.APPLE_CALENDAR_NAMES = 'Home';
    process.env.APP_TIMEZONE = 'UTC';
    process.env.CALENDAR_SYNC_PAST_DAYS = '7';
    process.env.CALENDAR_SYNC_FUTURE_DAYS = '90';

    vi.mocked(createAppleCalendarClient).mockResolvedValue({
      fetchCalendars: vi.fn().mockResolvedValue([
        { displayName: 'Home', url: 'https://caldav.icloud.com/home' },
      ]),
    } as never);

    vi.mocked(filterCalendarsByName).mockImplementation((calendars) => calendars);
    vi.mocked(prisma.calendarSyncState.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.calendarSyncState.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.calendarEvent.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.calendarEvent.deleteMany).mockResolvedValue({ count: 0 });
  });

  it('upserts parsed events and prunes stale rows on time-range fallback', async () => {
    vi.mocked(fetchCalendarEvents).mockResolvedValue({
      objects: [{ data: TIMED_EVENT, url: 'https://caldav.icloud.com/home/event-1.ics' }],
      deletedObjects: [],
      syncToken: 'token-1',
      usedTimeRangeFallback: true,
    });

    const recordsCount = await syncCalendarEvents();

    expect(prisma.calendarEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source_externalId: {
            source: 'apple',
            externalId: 'event-1',
          },
        },
        create: expect.objectContaining({
          title: 'Team meeting',
          calendarUrl: 'https://caldav.icloud.com/home',
        }),
      })
    );
    expect(prisma.calendarEvent.deleteMany).toHaveBeenCalled();
    expect(prisma.calendarSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { calendarUrl: 'https://caldav.icloud.com/home' },
        update: { syncToken: 'token-1' },
      })
    );
    expect(recordsCount).toBeGreaterThan(0);
  });

  it('deletes cancelled events without upserting them', async () => {
    vi.mocked(fetchCalendarEvents).mockResolvedValue({
      objects: [
        {
          data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-cancelled
DTSTART:20260710T150000Z
DTEND:20260710T160000Z
SUMMARY:Cancelled
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`,
          url: 'https://caldav.icloud.com/home/event-cancelled.ics',
        },
      ],
      deletedObjects: [],
      syncToken: 'token-1',
      usedTimeRangeFallback: true,
    });

    await syncCalendarEvents();

    expect(prisma.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        source: 'apple',
        externalId: 'event-cancelled',
        calendarUrl: 'https://caldav.icloud.com/home',
      },
    });
    expect(prisma.calendarEvent.upsert).not.toHaveBeenCalled();
  });
});

describe('logCalendarSyncResult', () => {
  it('writes sync log entries', async () => {
    vi.mocked(prisma.calendarSyncLog.create).mockResolvedValue({} as never);

    await logCalendarSyncResult(SmtSyncStatus.success, 3);

    expect(prisma.calendarSyncLog.create).toHaveBeenCalledWith({
      data: {
        status: SmtSyncStatus.success,
        recordsCount: 3,
        error: undefined,
      },
    });
  });
});
