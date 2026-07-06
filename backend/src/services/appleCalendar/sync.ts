import { SmtSyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createLogger } from '../../lib/logger';
import {
  addLocalDays,
  endOfLocalDay,
  getAppTimeZone,
  startOfLocalDay,
} from '../../lib/timezone';
import {
  createAppleCalendarClient,
  fetchCalendarEvents,
  filterCalendarsByName,
} from './caldavClient';
import { extractUidFromObjectUrl, parseIcalEvents } from './icalParser';
import {
  APPLE_CALENDAR_SOURCE,
  AppleCalendarError,
  getAppleCalendarConfig,
  isAppleCalendarConfigured,
} from './types';

const log = createLogger('apple-calendar-sync');

function isEventInWindow(start: Date, windowStart: Date, windowEnd: Date): boolean {
  return start.getTime() >= windowStart.getTime() && start.getTime() <= windowEnd.getTime();
}

export async function getAppleCalendarSyncStatus() {
  const configured = isAppleCalendarConfigured();
  const lastLog = await prisma.calendarSyncLog.findFirst({
    orderBy: { syncedAt: 'desc' },
  });

  return {
    configured,
    lastSync: lastLog?.syncedAt ?? null,
    lastStatus: lastLog?.status ?? null,
    lastError: lastLog?.error ?? null,
    recordsCount: lastLog?.recordsCount ?? 0,
  };
}

export async function syncCalendarEvents(fetchImpl?: typeof fetch): Promise<number> {
  const config = getAppleCalendarConfig();
  if (!config) {
    throw new AppleCalendarError('Apple Calendar not configured');
  }

  const client = await createAppleCalendarClient(config, fetchImpl);
  const calendars = filterCalendarsByName(await client.fetchCalendars(), config.calendarNames);

  if (calendars.length === 0) {
    throw new AppleCalendarError(
      `No calendars matched configured names: ${config.calendarNames.join(', ')}`
    );
  }

  const timeZone = getAppTimeZone();
  const now = new Date();
  const windowStart = startOfLocalDay(addLocalDays(now, -config.syncPastDays, timeZone), timeZone);
  const windowEnd = endOfLocalDay(addLocalDays(now, config.syncFutureDays, timeZone), timeZone);

  let recordsCount = 0;

  for (const calendar of calendars) {
    const state = await prisma.calendarSyncState.findUnique({
      where: { calendarUrl: calendar.url },
    });
    const syncToken = state?.syncToken ?? null;

    const fetchResult = await fetchCalendarEvents(
      client,
      calendar,
      syncToken,
      { start: windowStart, end: windowEnd },
      fetchImpl
    );

    const seenExternalIds = new Set<string>();

    for (const object of fetchResult.objects) {
      if (!object.data) {
        continue;
      }

      const parsedEvents = parseIcalEvents(String(object.data), timeZone);
      for (const parsed of parsedEvents) {
        if (parsed.cancelled) {
          const deleted = await prisma.calendarEvent.deleteMany({
            where: {
              source: APPLE_CALENDAR_SOURCE,
              externalId: parsed.uid,
              calendarUrl: calendar.url,
            },
          });
          recordsCount += deleted.count;
          continue;
        }

        if (!isEventInWindow(parsed.start, windowStart, windowEnd)) {
          continue;
        }

        seenExternalIds.add(parsed.uid);
        await prisma.calendarEvent.upsert({
          where: {
            source_externalId: {
              source: APPLE_CALENDAR_SOURCE,
              externalId: parsed.uid,
            },
          },
          update: {
            title: parsed.title,
            start: parsed.start,
            end: parsed.end,
            calendarUrl: calendar.url,
          },
          create: {
            externalId: parsed.uid,
            calendarUrl: calendar.url,
            title: parsed.title,
            start: parsed.start,
            end: parsed.end,
            source: APPLE_CALENDAR_SOURCE,
          },
        });
        recordsCount += 1;
      }
    }

    for (const deletedObject of fetchResult.deletedObjects) {
      const uid = extractUidFromObjectUrl(deletedObject.url);
      if (!uid) {
        continue;
      }

      const deleted = await prisma.calendarEvent.deleteMany({
        where: {
          source: APPLE_CALENDAR_SOURCE,
          calendarUrl: calendar.url,
          externalId: uid,
        },
      });
      recordsCount += deleted.count;
    }

    if (fetchResult.usedTimeRangeFallback) {
      const pruneWhere = {
        source: APPLE_CALENDAR_SOURCE,
        calendarUrl: calendar.url,
        start: {
          gte: windowStart,
          lte: windowEnd,
        },
        ...(seenExternalIds.size > 0
          ? { externalId: { notIn: [...seenExternalIds] } }
          : {}),
      };

      const pruned = await prisma.calendarEvent.deleteMany({
        where: pruneWhere,
      });
      recordsCount += pruned.count;
    }

    await prisma.calendarSyncState.upsert({
      where: { calendarUrl: calendar.url },
      update: { syncToken: fetchResult.syncToken },
      create: {
        calendarUrl: calendar.url,
        syncToken: fetchResult.syncToken,
      },
    });
  }

  log.info('Apple Calendar sync completed', {
    calendars: calendars.length,
    recordsCount,
  });

  return recordsCount;
}

export async function logCalendarSyncResult(
  status: SmtSyncStatus,
  recordsCount: number,
  error?: string
): Promise<void> {
  await prisma.calendarSyncLog.create({
    data: {
      status,
      recordsCount,
      error,
    },
  });

  if (status === SmtSyncStatus.success) {
    log.info('Apple Calendar sync logged', { recordsCount });
  } else if (status === SmtSyncStatus.error) {
    log.error('Apple Calendar sync failed', { recordsCount, error });
  }
}
