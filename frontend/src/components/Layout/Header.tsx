import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { WidgetId } from '../../types';
import { WIDGET_LABELS } from '../../types';

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface HeaderProps {
  visibility: Record<WidgetId, boolean>;
  onVisibilityChange: (widgetId: WidgetId, visible: boolean) => void;
  layoutLoading?: boolean;
  lastUpdatedAt?: Date | null;
  refreshing?: boolean;
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Header({
  visibility,
  onVisibilityChange,
  layoutLoading = false,
  lastUpdatedAt = null,
  refreshing = false,
}: HeaderProps) {
  const [now, setNow] = useState(new Date());
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="relative border-b border-surface-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">CreaDashboard</h1>
          <p className="text-sm text-gray-500">Домашний dashboard</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                refreshing ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'
              }`}
              aria-hidden
            />
            <span>
              {refreshing
                ? 'Обновление...'
                : lastUpdatedAt
                  ? `Обновлено ${formatLastUpdated(lastUpdatedAt)}`
                  : 'Загрузка...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings2 size={16} />
            Виджеты
          </button>

          <div className="text-right">
            <p className="text-sm font-medium capitalize text-gray-700">
              {formatDateTime(now)}
            </p>
            <p className="text-2xl font-light tabular-nums text-gray-900">
              {formatTime(now)}
            </p>
          </div>
        </div>
      </div>

      {panelOpen && (
        <div className="absolute right-6 top-full z-20 mt-2 w-72 rounded-xl border border-surface-border bg-surface p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Видимость виджетов
          </p>
          {layoutLoading && (
            <p className="mb-3 text-xs text-gray-500">
              Загрузка настроек...
            </p>
          )}
          <div className="space-y-2">
            {(Object.keys(WIDGET_LABELS) as WidgetId[]).map((widgetId) => (
              <label
                key={widgetId}
                className={`flex items-center justify-between gap-3 text-sm text-gray-600 ${
                  layoutLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <span>{WIDGET_LABELS[widgetId]}</span>
                <input
                  type="checkbox"
                  checked={visibility[widgetId] !== false}
                  disabled={layoutLoading}
                  onChange={(event) =>
                    onVisibilityChange(widgetId, event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500 disabled:cursor-not-allowed"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
