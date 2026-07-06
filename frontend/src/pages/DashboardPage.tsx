import { useMemo } from 'react';
import Header from '../components/Layout/Header';
import DashboardGrid from '../components/Layout/DashboardGrid';
import UtilityCard from '../components/utilities/UtilityCard';
import CalendarWidget from '../components/calendar/CalendarWidget';
import RemindersList from '../components/reminders/RemindersList';
import NotesPanel from '../components/notes/NotesPanel';
import { useDashboardData } from '../hooks/useDashboardData';
import { useWidgetLayout } from '../hooks/useWidgetLayout';
import type { WidgetId } from '../types';

export default function DashboardPage() {
  const {
    utilities,
    calendar,
    reminders,
    notes,
    loading: dataLoading,
    error: dataError,
  } = useDashboardData();
  const {
    order,
    loading: layoutLoading,
    error: layoutError,
    handleDragEnd,
  } = useWidgetLayout();

  const widgets = useMemo(() => {
    if (!utilities) {
      return null;
    }

    const registry: Record<WidgetId, React.ReactNode> = {
      electricity: <UtilityCard data={utilities.electricity} />,
      water: <UtilityCard data={utilities.water} />,
      gas: <UtilityCard data={utilities.gas} />,
      calendar: <CalendarWidget events={calendar} />,
      reminders: <RemindersList reminders={reminders} />,
      notes: <NotesPanel notes={notes} />,
    };

    return registry;
  }, [utilities, calendar, reminders, notes]);

  const loading = dataLoading || layoutLoading;
  const error = dataError || layoutError;

  return (
    <div className="min-h-screen bg-surface-muted">
      <Header />
      {loading && (
        <div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">
          Загрузка дашборда...
        </div>
      )}
      {error && (
        <div className="mx-auto max-w-7xl p-6 text-sm text-red-600">{error}</div>
      )}
      {!loading && widgets && order.length > 0 && (
        <DashboardGrid
          order={order}
          widgets={widgets}
          onDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
}
