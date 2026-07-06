import {
  getIntegrationDotClass,
  getIntegrationStatusTitle,
  type SyncStatus,
} from './integrationStatus';

interface IntegrationBadgeProps {
  connected: boolean;
  label: string;
  syncStatus: SyncStatus;
  syncError?: string | null;
}

export default function IntegrationBadge({
  connected,
  label,
  syncStatus,
  syncError,
}: IntegrationBadgeProps) {
  const displayLabel = connected ? label : 'Не подключено';
  const title = getIntegrationStatusTitle(connected, syncStatus, syncError);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
      title={title}
    >
      <span
        className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${getIntegrationDotClass(
          connected,
          syncStatus
        )}`}
        aria-hidden
      />
      {displayLabel}
    </span>
  );
}
