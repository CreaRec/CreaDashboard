import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap } from 'lucide-react';
import type { ElectricityIntervalsData } from '../../types';

const COLOR = '#f59e0b';

interface ElectricityIntervalsCardProps {
  data: ElectricityIntervalsData;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ElectricityIntervalsCard({
  data,
}: ElectricityIntervalsCardProps) {
  const chartData = data.readings.map((reading) => ({
    time: formatTime(reading.timestamp),
    kwh: reading.kwh,
  }));

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
            Электричество (15 мин)
          </span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {data.connected ? data.date : 'Не подключено'}
        </span>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">Нет интервальных данных за выбранный день.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [`${value} ${data.unit}`, 'Потребление']}
            />
            <Line
              type="monotone"
              dataKey="kwh"
              stroke={COLOR}
              strokeWidth={2}
              dot={{ r: 2, fill: COLOR }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
