import { useEffect, useState } from 'react';
import {
  fetchCalendar,
  fetchNotes,
  fetchReminders,
  fetchUtilities,
} from '../api/dashboard';
import {
  fetchElectricityBills,
  fetchElectricityCurrent,
  fetchElectricityIntervals,
  fetchElectricityMonthly,
} from '../api/electricity';
import { fetchWaterBills, fetchWaterDaily, fetchWaterMonthly } from '../api/water';
import { fetchGasBills, fetchGasMonthly } from '../api/gas';
import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  subscribeToDashboardEvents,
} from '../api/events';
import type {
  CalendarEvent,
  ElectricityCurrentData,
  ElectricityBillsData,
  ElectricityIntervalsData,
  ElectricityMonthlyData,
  Note,
  Reminder,
  UtilitiesMap,
  WaterBillsData,
  WaterDailyData,
  WaterMonthlyData,
  GasBillsData,
  GasMonthlyData,
} from '../types';

async function fetchAllDashboardData() {
  const [
    utilitiesData,
    monthlyData,
    electricityBillsData,
    intervalsData,
    currentData,
    waterMonthlyData,
    waterBillsData,
    waterDailyData,
    gasMonthlyData,
    gasBillsData,
    calendarData,
    remindersData,
    notesData,
  ] = await Promise.all([
    fetchUtilities(),
    fetchElectricityMonthly(),
    fetchElectricityBills(),
    fetchElectricityIntervals(),
    fetchElectricityCurrent(),
    fetchWaterMonthly(),
    fetchWaterBills(),
    fetchWaterDaily(),
    fetchGasMonthly(),
    fetchGasBills(),
    fetchCalendar(),
    fetchReminders(),
    fetchNotes(),
  ]);

  return {
    utilities: utilitiesData,
    electricityMonthly: monthlyData,
    electricityBills: electricityBillsData,
    electricityIntervals: intervalsData,
    electricityCurrent: currentData,
    waterMonthly: waterMonthlyData,
    waterBills: waterBillsData,
    waterDaily: waterDailyData,
    gasMonthly: gasMonthlyData,
    gasBills: gasBillsData,
    calendar: calendarData,
    reminders: remindersData,
    notes: notesData,
  };
}

export function useDashboardData() {
  const [utilities, setUtilities] = useState<UtilitiesMap | null>(null);
  const [electricityMonthly, setElectricityMonthly] =
    useState<ElectricityMonthlyData | null>(null);
  const [electricityBills, setElectricityBills] = useState<ElectricityBillsData | null>(null);
  const [electricityIntervals, setElectricityIntervals] =
    useState<ElectricityIntervalsData | null>(null);
  const [electricityCurrent, setElectricityCurrent] =
    useState<ElectricityCurrentData | null>(null);
  const [waterMonthly, setWaterMonthly] = useState<WaterMonthlyData | null>(null);
  const [waterBills, setWaterBills] = useState<WaterBillsData | null>(null);
  const [waterDaily, setWaterDaily] = useState<WaterDailyData | null>(null);
  const [gasMonthly, setGasMonthly] = useState<GasMonthlyData | null>(null);
  const [gasBills, setGasBills] = useState<GasBillsData | null>(null);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData(isBackground: boolean) {
      if (isBackground) {
        setRefreshing(true);
      }

      try {
        const data = await fetchAllDashboardData();

        if (!cancelled) {
          setUtilities(data.utilities);
          setElectricityMonthly(data.electricityMonthly);
          setElectricityBills(data.electricityBills);
          setElectricityIntervals(data.electricityIntervals);
          setElectricityCurrent(data.electricityCurrent);
          setWaterMonthly(data.waterMonthly);
          setWaterBills(data.waterBills);
          setWaterDaily(data.waterDaily);
          setGasMonthly(data.gasMonthly);
          setGasBills(data.gasBills);
          setCalendar(data.calendar);
          setReminders(data.reminders);
          setNotes(data.notes);
          setLastUpdatedAt(new Date());
          setError(null);
        }
      } catch {
        if (!cancelled && !isBackground) {
          setError('Не удалось загрузить данные дашборда');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadData(false);

    const pollTimer = setInterval(() => {
      loadData(true);
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    const unsubscribeEvents = subscribeToDashboardEvents(() => {
      loadData(true);
    });

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      unsubscribeEvents();
    };
  }, []);

  return {
    utilities,
    electricityMonthly,
    electricityBills,
    electricityIntervals,
    electricityCurrent,
    waterMonthly,
    waterBills,
    waterDaily,
    gasMonthly,
    gasBills,
    calendar,
    reminders,
    notes,
    loading,
    refreshing,
    lastUpdatedAt,
    error,
  };
}
