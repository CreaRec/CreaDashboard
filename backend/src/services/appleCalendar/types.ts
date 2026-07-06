export const DEFAULT_APPLE_CALDAV_URL = 'https://caldav.icloud.com';
export const APPLE_CALENDAR_SOURCE = 'apple';

export class AppleCalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppleCalendarError';
  }
}

export class AppleCalendarAuthError extends AppleCalendarError {
  constructor(message = 'Invalid Apple Calendar credentials') {
    super(message);
    this.name = 'AppleCalendarAuthError';
  }
}

export interface AppleCalendarConfig {
  caldavUrl: string;
  appleId: string;
  appPassword: string;
  calendarNames: string[];
  syncIntervalMinutes: number;
  syncPastDays: number;
  syncFutureDays: number;
}

export interface ParsedCalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date | null;
  cancelled: boolean;
}

function parseCalendarNames(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

export function getAppleCalendarConfig(): AppleCalendarConfig | null {
  const appleId = process.env.APPLE_ID?.trim();
  const appPassword = process.env.APPLE_APP_PASSWORD?.trim();
  const calendarNames = parseCalendarNames(process.env.APPLE_CALENDAR_NAMES);

  if (!appleId || !appPassword || calendarNames.length === 0) {
    return null;
  }

  return {
    caldavUrl: process.env.APPLE_CALDAV_URL?.trim() || DEFAULT_APPLE_CALDAV_URL,
    appleId,
    appPassword,
    calendarNames,
    syncIntervalMinutes: Math.max(
      parsePositiveInt(process.env.CALENDAR_SYNC_INTERVAL_MINUTES, 30),
      1
    ),
    syncPastDays: parsePositiveInt(process.env.CALENDAR_SYNC_PAST_DAYS, 7),
    syncFutureDays: parsePositiveInt(process.env.CALENDAR_SYNC_FUTURE_DAYS, 90),
  };
}

export function isAppleCalendarConfigured(): boolean {
  return getAppleCalendarConfig() !== null;
}
