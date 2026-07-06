export type SyncStatus = 'success' | 'error' | 'skipped' | null;

export function getIntegrationDotClass(
  connected: boolean,
  syncStatus: SyncStatus
): string {
  if (!connected) {
    return 'bg-gray-300';
  }

  if (syncStatus === 'error') {
    return 'bg-red-500';
  }

  if (syncStatus === 'success') {
    return 'bg-emerald-500';
  }

  if (syncStatus === 'skipped') {
    return 'bg-amber-400';
  }

  return 'bg-gray-300';
}

export function getIntegrationStatusTitle(
  connected: boolean,
  syncStatus: SyncStatus,
  syncError: string | null | undefined
): string | undefined {
  if (!connected) {
    return 'Интеграция не настроена';
  }

  if (syncStatus === 'error') {
    return syncError ?? 'Ошибка синхронизации';
  }

  if (syncStatus === 'success') {
    return 'Синхронизация работает';
  }

  if (syncStatus === 'skipped') {
    return 'Последняя синхронизация пропущена';
  }

  return 'Ожидание первой синхронизации';
}
