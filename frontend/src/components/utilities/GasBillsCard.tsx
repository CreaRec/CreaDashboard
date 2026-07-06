import { Flame } from 'lucide-react';
import type { GasBillsData } from '../../types';
import BillsChart from './BillsChart';

const COLOR = '#ef4444';

interface GasBillsCardProps {
  data: GasBillsData;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export default function GasBillsCard({ data }: GasBillsCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${COLOR}18` }}
          >
            <Flame size={16} style={{ color: COLOR }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{data.label}</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {data.connected ? 'Atmos Energy' : 'Не подключено'}
        </span>
      </div>

      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-gray-900">
          {formatAmount(data.currentAmount, data.currency)}
        </span>
      </div>

      {data.readings.length > 0 ? (
        <BillsChart data={data.readings} currency={data.currency} color={COLOR} />
      ) : (
        <p className="text-sm text-gray-500">Нет данных о счетах</p>
      )}
    </div>
  );
}
