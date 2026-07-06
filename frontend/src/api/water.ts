import apiFetch from './client';
import type { WaterBillsData, WaterDailyData, WaterMonthlyData, WaterSmartStatus } from '../types';

export function fetchWaterMonthly(): Promise<WaterMonthlyData> {
  return apiFetch<WaterMonthlyData>('/api/water/monthly');
}

export function fetchWaterBills(): Promise<WaterBillsData> {
  return apiFetch<WaterBillsData>('/api/water/bills');
}

export function fetchWaterDaily(date?: string): Promise<WaterDailyData> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<WaterDailyData>(`/api/water/daily${query}`);
}

export function fetchWaterSmartStatus(): Promise<WaterSmartStatus> {
  return apiFetch<WaterSmartStatus>('/api/integrations/watersmart/status');
}
