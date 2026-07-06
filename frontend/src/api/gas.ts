import apiFetch from './client';
import type { AtmosStatus, GasBillsData, GasMonthlyData } from '../types';

export function fetchGasMonthly(): Promise<GasMonthlyData> {
  return apiFetch<GasMonthlyData>('/api/gas/monthly');
}

export function fetchGasBills(): Promise<GasBillsData> {
  return apiFetch<GasBillsData>('/api/gas/bills');
}

export function fetchAtmosStatus(): Promise<AtmosStatus> {
  return apiFetch<AtmosStatus>('/api/integrations/atmos/status');
}
