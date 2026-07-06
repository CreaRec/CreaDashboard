export type UtilityType = 'electricity' | 'water' | 'gas';

export type SyncStatus = 'success' | 'error' | 'skipped' | null;

export interface IntegrationStatusFields {
  connected: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
}

export type WidgetId =
  | 'electricityMonthly'
  | 'electricityBills'
  | 'electricityIntervals'
  | 'electricityCurrent'
  | 'waterMonthly'
  | 'waterBills'
  | 'waterDaily'
  | 'gasMonthly'
  | 'gasBills'
  | 'localRestrictions'
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

export interface ElectricityMonthlyData extends IntegrationStatusFields {
  label: string;
  unit: string;
  currency: string;
  currentConsumption: number;
  currentCost: number;
  estimatedCost: boolean;
  readings: UtilityReading[];
}

export interface ElectricityBillPoint {
  month: string;
  amount: number;
}

export interface ElectricityBillsData extends IntegrationStatusFields {
  label: string;
  currency: string;
  currentAmount: number;
  readings: ElectricityBillPoint[];
}

export interface ElectricityIntervalPoint {
  timestamp: string;
  kwh: number;
}

export interface ElectricityIntervalsData extends IntegrationStatusFields {
  date: string;
  unit: string;
  readings: ElectricityIntervalPoint[];
}

export interface ElectricityCurrentData extends IntegrationStatusFields {
  unit: string;
  readingKwh: number | null;
  readAt: string | null;
  esiid: string | null;
}

export interface WaterDailyPoint {
  date: string;
  gallons: number;
}

export interface WaterDailyData extends IntegrationStatusFields {
  month: string;
  unit: string;
  readings: WaterDailyPoint[];
}

export interface WaterBillPoint {
  month: string;
  amount: number;
}

export interface WaterBillsData extends IntegrationStatusFields {
  label: string;
  currency: string;
  currentAmount: number;
  readings: WaterBillPoint[];
}

export interface WaterMonthlyData extends IntegrationStatusFields {
  label: string;
  unit: string;
  currency: string;
  currentConsumption: number;
  currentCost: number;
  estimatedCost: boolean;
  readings: UtilityReading[];
}

export interface WaterSmartStatus {
  configured: boolean;
  lastSync: string | null;
  lastStatus: string | null;
  lastError: string | null;
  recordsCount: number;
}

export interface GasBillPoint {
  month: string;
  amount: number;
}

export interface GasBillsData extends IntegrationStatusFields {
  label: string;
  currency: string;
  currentAmount: number;
  readings: GasBillPoint[];
}

export interface GasMonthlyData extends IntegrationStatusFields {
  label: string;
  unit: string;
  currency: string;
  currentConsumption: number;
  currentCost: number;
  estimatedCost: boolean;
  readings: UtilityReading[];
}

export interface AtmosStatus {
  configured: boolean;
  lastSync: string | null;
  lastStatus: string | null;
  lastError: string | null;
  recordsCount: number;
}

export interface ChampionStatus {
  configured: boolean;
  lastSync: string | null;
  lastStatus: string | null;
  lastError: string | null;
  recordsCount: number;
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

export interface RestrictionsData {
  burnBan: {
    active: boolean;
    county: string;
    label: string;
  };
  water: {
    stageLabel: string;
  };
  fetchedAt: string;
}

export const WIDGET_LABELS: Record<WidgetId, string> = {
  electricityMonthly: 'Электричество (месяц)',
  electricityBills: 'Электричество (счет)',
  electricityIntervals: 'Электричество (15 мин)',
  electricityCurrent: 'Электричество (сейчас)',
  waterMonthly: 'Вода (месяц)',
  waterBills: 'Вода (счет)',
  waterDaily: 'Вода (день)',
  gasMonthly: 'Газ (месяц)',
  gasBills: 'Газ (счет)',
  localRestrictions: 'Местные ограничения',
  calendar: 'Календарь',
  reminders: 'Напоминания',
  notes: 'Заметки',
};
