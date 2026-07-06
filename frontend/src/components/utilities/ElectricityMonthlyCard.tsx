import { Zap } from 'lucide-react';
import type { ElectricityMonthlyData } from '../../types';
import ConsumptionChart from './ConsumptionChart';
import IntegrationBadge from './IntegrationBadge';

const COLOR = '#f59e0b';

interface ElectricityMonthlyCardProps {
  data: ElectricityMonthlyData;
}

function formatCost(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export default function ElectricityMonthlyCard({ data }: ElectricityMonthlyCardProps) {
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
          label="Smart Meter Texas"
          syncStatus={data.syncStatus}
          syncError={data.syncError}
        />
      </div>

      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-gray-900">
          {data.currentConsumption}
        </span>
        <span className="text-sm text-gray-500">{data.unit}</span>
      </div>

      {data.estimatedCost && (
        <p className="mb-3 text-sm text-gray-500">
          Оценка:{' '}
          <span className="font-medium text-gray-700">
            {formatCost(data.currentCost, data.currency)}
          </span>
        </p>
      )}

      {!data.estimatedCost && data.currentCost > 0 && (
        <p className="mb-3 text-sm text-gray-500">
          Счет:{' '}
          <span className="font-medium text-gray-700">
            {formatCost(data.currentCost, data.currency)}
          </span>
        </p>
      )}

      <ConsumptionChart data={data.readings} unit={data.unit} color={COLOR} />
    </div>
  );
}
