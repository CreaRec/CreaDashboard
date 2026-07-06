import { Flame, Droplets } from 'lucide-react';
import type { RestrictionsData } from '../../types';

interface LocalRestrictionsCardProps {
  data: RestrictionsData;
}

function getBurnBanBadgeClass(active: boolean): string {
  return active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
}

function getWaterBadgeClass(stageLabel: string): string {
  const normalized = stageLabel.toLowerCase();

  if (normalized === 'unknown') {
    return 'bg-gray-100 text-gray-600';
  }

  if (normalized.includes('stage 3') || normalized.includes('emergency')) {
    return 'bg-red-100 text-red-700';
  }

  if (normalized.includes('stage 1') || normalized.includes('stage 2')) {
    return 'bg-yellow-100 text-yellow-800';
  }

  if (normalized.includes('none') || normalized.includes('no restriction')) {
    return 'bg-green-100 text-green-700';
  }

  return 'bg-yellow-100 text-yellow-800';
}

export default function LocalRestrictionsCard({ data }: LocalRestrictionsCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-medium text-gray-700">Местные ограничения</h2>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <Flame size={16} className="text-gray-500" />
            <span>Burn Ban ({data.burnBan.county} County)</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getBurnBanBadgeClass(data.burnBan.active)}`}
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {data.burnBan.label}
          </span>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <Droplets size={16} className="text-gray-500" />
            <span>Вода (Pflugerville)</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getWaterBadgeClass(data.water.stageLabel)}`}
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {data.water.stageLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
