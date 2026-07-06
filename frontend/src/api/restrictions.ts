import apiFetch from './client';
import type { RestrictionsData } from '../types';

export function fetchRestrictions(): Promise<RestrictionsData> {
  return apiFetch<RestrictionsData>('/api/restrictions');
}
