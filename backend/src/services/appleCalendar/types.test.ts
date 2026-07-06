import { describe, expect, it } from 'vitest';
import {
  getAppleCalendarConfig,
  isAppleCalendarConfigured,
} from './types';

describe('apple calendar config', () => {
  it('returns null when required env vars are missing', () => {
    delete process.env.APPLE_ID;
    delete process.env.APPLE_APP_PASSWORD;
    delete process.env.APPLE_CALENDAR_NAMES;

    expect(getAppleCalendarConfig()).toBeNull();
    expect(isAppleCalendarConfigured()).toBe(false);
  });

  it('parses calendar names and sync settings', () => {
    process.env.APPLE_ID = 'user@icloud.com';
    process.env.APPLE_APP_PASSWORD = 'app-password';
    process.env.APPLE_CALENDAR_NAMES = ' Home , Work ';
    process.env.CALENDAR_SYNC_INTERVAL_MINUTES = '45';
    process.env.CALENDAR_SYNC_PAST_DAYS = '3';
    process.env.CALENDAR_SYNC_FUTURE_DAYS = '30';

    expect(getAppleCalendarConfig()).toEqual({
      caldavUrl: 'https://caldav.icloud.com',
      appleId: 'user@icloud.com',
      appPassword: 'app-password',
      calendarNames: ['Home', 'Work'],
      syncIntervalMinutes: 45,
      syncPastDays: 3,
      syncFutureDays: 30,
    });
    expect(isAppleCalendarConfigured()).toBe(true);
  });
});
