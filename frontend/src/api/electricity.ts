import apiFetch from './client';
import type {
  ElectricityCurrentData,
  ElectricityIntervalsData,
  ElectricityMonthlyData,
  SmtStatus,
} from '../types';

export function fetchElectricityMonthly(): Promise<ElectricityMonthlyData> {
  return apiFetch<ElectricityMonthlyData>('/api/electricity/monthly');
}

export function fetchElectricityIntervals(
  date?: string
): Promise<ElectricityIntervalsData> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<ElectricityIntervalsData>(`/api/electricity/intervals${query}`);
}

export function fetchElectricityCurrent(): Promise<ElectricityCurrentData> {
  return apiFetch<ElectricityCurrentData>('/api/electricity/current');
}

export function fetchSmtStatus(): Promise<SmtStatus> {
  return apiFetch<SmtStatus>('/api/integrations/smt/status');
}
