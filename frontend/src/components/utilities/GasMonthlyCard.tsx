import { Flame } from 'lucide-react';
import type { GasMonthlyData } from '../../types';
import ConsumptionChart from './ConsumptionChart';

const COLOR = '#ef4444';

interface GasMonthlyCardProps {
  data: GasMonthlyData;
}

export default function GasMonthlyCard({ data }: GasMonthlyCardProps) {
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
          {data.currentConsumption.toLocaleString('en-US', { maximumFractionDigits: 1 })}
        </span>
        <span className="text-sm text-gray-500">{data.unit}</span>
      </div>

      <ConsumptionChart data={data.readings} unit={data.unit} color={COLOR} />
    </div>
  );
}
