import apiFetch from './client';
import type { WidgetId, WidgetLayout } from '../types';

export function fetchLayout(): Promise<WidgetLayout> {
  return apiFetch<WidgetLayout>('/api/layout');
}

export function saveLayout(order: WidgetId[]): Promise<WidgetLayout> {
  return apiFetch<WidgetLayout>('/api/layout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });
}
