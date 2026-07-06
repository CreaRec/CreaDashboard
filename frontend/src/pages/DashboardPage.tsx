import { useMemo } from 'react';
import Header from '../components/Layout/Header';
import DashboardGrid from '../components/Layout/DashboardGrid';
import GasMonthlyCard from '../components/utilities/GasMonthlyCard';
import GasBillsCard from '../components/utilities/GasBillsCard';
import WaterMonthlyCard from '../components/utilities/WaterMonthlyCard';
import WaterBillsCard from '../components/utilities/WaterBillsCard';
import WaterDailyCard from '../components/utilities/WaterDailyCard';
import ElectricityMonthlyCard from '../components/utilities/ElectricityMonthlyCard';
import ElectricityBillsCard from '../components/utilities/ElectricityBillsCard';
import ElectricityIntervalsCard from '../components/utilities/ElectricityIntervalsCard';
import ElectricityCurrentCard from '../components/utilities/ElectricityCurrentCard';
import CalendarWidget from '../components/calendar/CalendarWidget';
import RemindersList from '../components/reminders/RemindersList';
import NotesPanel from '../components/notes/NotesPanel';
import LocalRestrictionsCard from '../components/restrictions/LocalRestrictionsCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useWidgetLayout } from '../hooks/useWidgetLayout';
import type { WidgetId } from '../types';

export default function DashboardPage() {
  const {
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
    restrictions,
    calendar,
    reminders,
    notes,
    loading: dataLoading,
    refreshing: dataRefreshing,
    lastUpdatedAt,
    error: dataError,
  } = useDashboardData();
  const {
    visibleOrder,
    visibility,
    loading: layoutLoading,
    error: layoutError,
    handleDragEnd,
    handleVisibilityChange,
  } = useWidgetLayout();

  const widgets = useMemo(() => {
    if (!utilities || !electricityMonthly || !electricityBills || !electricityIntervals || !electricityCurrent || !waterMonthly || !waterBills || !waterDaily || !gasMonthly || !gasBills || !restrictions) {
      return null;
    }

    const registry: Record<WidgetId, React.ReactNode> = {
      electricityMonthly: <ElectricityMonthlyCard data={electricityMonthly} />,
      electricityBills: <ElectricityBillsCard data={electricityBills} />,
      electricityIntervals: (
        <ElectricityIntervalsCard data={electricityIntervals} />
      ),
      electricityCurrent: <ElectricityCurrentCard data={electricityCurrent} />,
      waterMonthly: <WaterMonthlyCard data={waterMonthly} />,
      waterBills: <WaterBillsCard data={waterBills} />,
      waterDaily: <WaterDailyCard data={waterDaily} />,
      gasMonthly: <GasMonthlyCard data={gasMonthly} />,
      gasBills: <GasBillsCard data={gasBills} />,
      localRestrictions: <LocalRestrictionsCard data={restrictions} />,
      calendar: <CalendarWidget events={calendar} />,
      reminders: <RemindersList reminders={reminders} />,
      notes: <NotesPanel notes={notes} />,
    };

    return registry;
  }, [
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
    restrictions,
    calendar,
    reminders,
    notes,
  ]);

  const loading = dataLoading || layoutLoading;
  const error = dataError || layoutError;

  return (
    <div className="min-h-screen bg-surface-muted">
      <Header
        visibility={visibility}
        onVisibilityChange={handleVisibilityChange}
        layoutLoading={layoutLoading}
        lastUpdatedAt={lastUpdatedAt}
        refreshing={dataRefreshing}
      />
      {loading && (
        <div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">
          Загрузка дашборда...
        </div>
      )}
      {error && (
        <div className="mx-auto max-w-7xl p-6 text-sm text-red-600">{error}</div>
      )}
      {!loading && widgets && visibleOrder.length > 0 && (
        <DashboardGrid
          order={visibleOrder}
          widgets={widgets}
          onDragEnd={handleDragEnd}
        />
      )}
      {!loading && visibleOrder.length === 0 && (
        <div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">
          Все виджеты скрыты. Включите их в меню «Виджеты».
        </div>
      )}
    </div>
  );
}
