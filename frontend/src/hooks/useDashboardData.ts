import { useEffect, useState } from 'react';
import {
  fetchCalendar,
  fetchNotes,
  fetchReminders,
  fetchUtilities,
} from '../api/dashboard';
import {
  fetchElectricityCurrent,
  fetchElectricityIntervals,
  fetchElectricityMonthly,
} from '../api/electricity';
import type {
  CalendarEvent,
  ElectricityCurrentData,
  ElectricityIntervalsData,
  ElectricityMonthlyData,
  Note,
  Reminder,
  UtilitiesMap,
} from '../types';

export function useDashboardData() {
  const [utilities, setUtilities] = useState<UtilitiesMap | null>(null);
  const [electricityMonthly, setElectricityMonthly] =
    useState<ElectricityMonthlyData | null>(null);
  const [electricityIntervals, setElectricityIntervals] =
    useState<ElectricityIntervalsData | null>(null);
  const [electricityCurrent, setElectricityCurrent] =
    useState<ElectricityCurrentData | null>(null);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [
          utilitiesData,
          monthlyData,
          intervalsData,
          currentData,
          calendarData,
          remindersData,
          notesData,
        ] = await Promise.all([
          fetchUtilities(),
          fetchElectricityMonthly(),
          fetchElectricityIntervals(),
          fetchElectricityCurrent(),
          fetchCalendar(),
          fetchReminders(),
          fetchNotes(),
        ]);

        if (!cancelled) {
          setUtilities(utilitiesData);
          setElectricityMonthly(monthlyData);
          setElectricityIntervals(intervalsData);
          setElectricityCurrent(currentData);
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
    electricityMonthly,
    electricityIntervals,
    electricityCurrent,
    calendar,
    reminders,
    notes,
    loading,
    error,
  };
}
