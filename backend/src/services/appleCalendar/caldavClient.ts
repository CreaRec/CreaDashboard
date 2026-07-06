import { DAVCalendar, DAVCalendarObject, DAVClient } from 'tsdav';
import type { AppleCalendarConfig } from './types';
import { AppleCalendarAuthError } from './types';

export function getCalendarDisplayName(calendar: DAVCalendar): string {
  if (typeof calendar.displayName === 'string') {
    return calendar.displayName;
  }

  if (calendar.displayName && typeof calendar.displayName === 'object') {
    const values = Object.values(calendar.displayName).filter(
      (value): value is string => typeof value === 'string'
    );
    if (values.length > 0) {
      return values[0];
    }
  }

  return '';
}

export function filterCalendarsByName(
  calendars: DAVCalendar[],
  names: string[]
): DAVCalendar[] {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));

  return calendars.filter((calendar) =>
    normalizedNames.has(getCalendarDisplayName(calendar).toLowerCase())
  );
}

export function formatCalDavDate(date: Date): string {
  return date.toISOString();
}

export async function createAppleCalendarClient(
  config: AppleCalendarConfig,
  fetchImpl?: typeof fetch
): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: config.caldavUrl,
    credentials: {
      username: config.appleId,
      password: config.appPassword,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
    fetch: fetchImpl,
  });

  try {
    await client.login();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('401') || message.toLowerCase().includes('unauthorized')) {
      throw new AppleCalendarAuthError();
    }

    throw error;
  }

  return client;
}

export type FetchCalendarEventsResult = {
  objects: DAVCalendarObject[];
  deletedObjects: DAVCalendarObject[];
  syncToken: string | null;
  usedTimeRangeFallback: boolean;
};

export async function fetchCalendarEvents(
  client: DAVClient,
  calendar: DAVCalendar,
  syncToken: string | null,
  timeRange: { start: Date; end: Date },
  fetchImpl?: typeof fetch
): Promise<FetchCalendarEventsResult> {
  if (syncToken) {
    try {
      const result = await client.smartCollectionSyncDetailed({
        collection: {
          ...calendar,
          syncToken,
        },
        method: 'webdav',
        fetch: fetchImpl,
      });

      return {
        objects: [...result.objects.created, ...result.objects.updated],
        deletedObjects: result.objects.deleted,
        syncToken: result.syncToken ?? syncToken,
        usedTimeRangeFallback: false,
      };
    } catch {
      // Fall back to a full time-range query when sync-token sync fails.
    }
  }

  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: formatCalDavDate(timeRange.start),
      end: formatCalDavDate(timeRange.end),
    },
    expand: true,
    fetch: fetchImpl,
  });

  return {
    objects,
    deletedObjects: [],
    syncToken: calendar.syncToken ?? syncToken,
    usedTimeRangeFallback: true,
  };
}
