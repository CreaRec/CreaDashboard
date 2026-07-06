const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

export { DASHBOARD_REFRESH_INTERVAL_MS };

export function subscribeToDashboardEvents(
  onUpdate: () => void,
  onError?: (error: Event) => void
): () => void {
  const source = new EventSource('/api/events');

  source.addEventListener('dashboard.updated', onUpdate);

  if (onError) {
    source.onerror = onError;
  }

  return () => source.close();
}
