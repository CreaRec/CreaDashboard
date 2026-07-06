export type UtilityType = 'electricity' | 'water' | 'gas';

export type WidgetId =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'calendar'
  | 'reminders'
  | 'notes';

export interface WidgetLayout {
  order: WidgetId[];
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
  currentConsumption: number;
  currentCost: number;
  readings: UtilityReading[];
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
