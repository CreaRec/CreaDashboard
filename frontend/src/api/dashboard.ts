import apiFetch from './client';
import type {
  CalendarEvent,
  Note,
  Reminder,
  UtilitiesMap,
} from '../types';

export function fetchUtilities(): Promise<UtilitiesMap> {
  return apiFetch<UtilitiesMap>('/api/utilities');
}

export function fetchCalendar(): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>('/api/calendar');
}

export function fetchReminders(): Promise<Reminder[]> {
  return apiFetch<Reminder[]>('/api/reminders');
}

export function fetchNotes(): Promise<Note[]> {
  return apiFetch<Note[]>('/api/notes');
}
