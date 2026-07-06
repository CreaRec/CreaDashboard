import { Zap } from 'lucide-react';
import type { ElectricityBillsData } from '../../types';
import BillsChart from './BillsChart';
import IntegrationBadge from './IntegrationBadge';

const COLOR = '#f59e0b';

interface ElectricityBillsCardProps {
  data: ElectricityBillsData;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export default function ElectricityBillsCard({ data }: ElectricityBillsCardProps) {
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
          <span className="text-sm font-medium text-gray-700">{data.label}</span>
        </div>
        <IntegrationBadge
          connected={data.connected}
          label="Champion Energy"
          syncStatus={data.syncStatus}
          syncError={data.syncError}
        />
      </div>

      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-gray-900">
          {formatAmount(data.currentAmount, data.currency)}
        </span>
        <span className="text-sm text-gray-500">последний счёт</span>
      </div>

      {data.readings.length > 0 ? (
        <BillsChart data={data.readings} currency={data.currency} color={COLOR} />
      ) : (
        <p className="text-sm text-gray-500">Нет данных о счетах</p>
      )}
    </div>
  );
}
