import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Droplets } from 'lucide-react';
import type { WaterDailyData } from '../../types';

const COLOR = '#3b82f6';

interface WaterDailyCardProps {
  data: WaterDailyData;
}

function formatDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}.${month}`;
}

export default function WaterDailyCard({ data }: WaterDailyCardProps) {
  const chartData = data.readings.map((reading) => ({
    day: formatDay(reading.date),
    gallons: reading.gallons,
  }));

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${COLOR}18` }}
          >
            <Droplets size={16} style={{ color: COLOR }} />
          </div>
          <span className="text-sm font-medium text-gray-700">Вода (день)</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {data.connected ? data.month : 'Не подключено'}
        </span>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">Нет дневных данных за выбранный месяц.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
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
              dataKey="gallons"
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
