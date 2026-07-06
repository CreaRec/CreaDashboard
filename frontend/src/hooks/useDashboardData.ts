import { useEffect, useState } from 'react';
import {
  fetchCalendar,
  fetchNotes,
  fetchReminders,
  fetchUtilities,
} from '../api/dashboard';
import type {
  CalendarEvent,
  Note,
  Reminder,
  UtilitiesMap,
} from '../types';

export function useDashboardData() {
  const [utilities, setUtilities] = useState<UtilitiesMap | null>(null);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [utilitiesData, calendarData, remindersData, notesData] =
          await Promise.all([
            fetchUtilities(),
            fetchCalendar(),
            fetchReminders(),
            fetchNotes(),
          ]);

        if (!cancelled) {
          setUtilities(utilitiesData);
          setCalendar(calendarData);
          setReminders(remindersData);
          setNotes(notesData);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить данные дашборда');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    utilities,
    calendar,
    reminders,
    notes,
    loading,
    error,
  };
}
