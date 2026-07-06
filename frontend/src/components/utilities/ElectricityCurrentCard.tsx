import { Zap } from 'lucide-react';
import type { ElectricityCurrentData } from '../../types';

const COLOR = '#f59e0b';

interface ElectricityCurrentCardProps {
  data: ElectricityCurrentData;
}

function formatReadAt(readAt: string | null): string {
  if (!readAt) {
    return 'Нет данных';
  }

  return new Date(readAt).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ElectricityCurrentCard({ data }: ElectricityCurrentCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${COLOR}18` }}
          >
            <Zap size={16} style={{ color: COLOR }} />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Текущее показание
          </span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          Smart Meter Texas
        </span>
      </div>

      {data.readingKwh !== null ? (
        <>
          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-gray-900">
              {data.readingKwh.toLocaleString('en-US', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
            <span className="text-sm text-gray-500">{data.unit}</span>
          </div>
          <p className="text-sm text-gray-500">
            Обновлено:{' '}
            <span className="font-medium text-gray-700">
              {formatReadAt(data.readAt)}
            </span>
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          {data.connected
            ? 'Ожидание on-demand чтения счётчика...'
            : 'Подключите Smart Meter Texas в .env backend'}
        </p>
      )}
    </div>
  );
}
