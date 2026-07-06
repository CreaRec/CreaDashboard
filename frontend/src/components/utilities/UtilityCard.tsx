import { Zap, Droplets, Flame, LucideIcon } from 'lucide-react';
import type { UtilityData, UtilityType } from '../../types';
import ConsumptionChart from './ConsumptionChart';

const iconMap: Record<UtilityType, LucideIcon> = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
};

const colorMap: Record<UtilityType, string> = {
  electricity: '#f59e0b',
  water: '#3b82f6',
  gas: '#ef4444',
};

interface UtilityCardProps {
  data: UtilityData;
}

export default function UtilityCard({ data }: UtilityCardProps) {
  const Icon = iconMap[data.type];
  const color = colorMap[data.type];

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{data.label}</span>
        </div>
      </div>

      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-gray-900">
          {data.currentConsumption}
        </span>
        <span className="text-sm text-gray-500">{data.unit}</span>
      </div>

      <p className="mb-3 text-sm text-gray-500">
        Сумма:{' '}
        <span className="font-medium text-gray-700">
          {data.currency === 'USD'
            ? `$${data.currentCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${data.currentCost.toLocaleString('ru-RU')} ₽`}
        </span>
      </p>

      <ConsumptionChart data={data.readings} unit={data.unit} color={color} />
    </div>
  );
}
