export type UtilityType = 'electricity' | 'water' | 'gas';

export type WidgetId =
  | 'electricityMonthly'
  | 'electricityIntervals'
  | 'electricityCurrent'
  | 'water'
  | 'gas'
  | 'calendar'
  | 'reminders'
  | 'notes';

export interface WidgetLayout {
  order: WidgetId[];
  visibility: Record<WidgetId, boolean>;
}

export interface UtilityReading {
  month: string;
  consumption: number;
  cost: number;
}

export interface UtilityData {
  type: UtilityType;
  label: string;
  unit: string;
  currency: string;
  connected: boolean;
  currentConsumption: number;
  currentCost: number;
  readings: UtilityReading[];
}

export interface ElectricityMonthlyData {
  connected: boolean;
  label: string;
  unit: string;
  currency: string;
  currentConsumption: number;
  currentCost: number;
  estimatedCost: boolean;
  readings: UtilityReading[];
}

export interface ElectricityIntervalPoint {
  timestamp: string;
  kwh: number;
}

export interface ElectricityIntervalsData {
  connected: boolean;
  date: string;
  unit: string;
  readings: ElectricityIntervalPoint[];
}

export interface ElectricityCurrentData {
  connected: boolean;
  unit: string;
  readingKwh: number | null;
  readAt: string | null;
  esiid: string | null;
}

export interface SmtStatus {
  configured: boolean;
  lastSync: string | null;
  lastStatus: string | null;
  lastError: string | null;
  recordsCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  source: 'apple' | 'manual';
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
  updatedAt: string;
}

export type UtilitiesMap = Record<UtilityType, UtilityData>;

export const WIDGET_LABELS: Record<WidgetId, string> = {
  electricityMonthly: 'Электричество (месяц)',
  electricityIntervals: 'Электричество (15 мин)',
  electricityCurrent: 'Электричество (сейчас)',
  water: 'Вода',
  gas: 'Газ',
  calendar: 'Календарь',
  reminders: 'Напоминания',
  notes: 'Заметки',
};
