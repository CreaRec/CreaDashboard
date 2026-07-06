import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMonthLabel, monthSortKey } from '../../lib/formatMonth';
import type { UtilityReading } from '../../types';

interface ConsumptionChartProps {
  data: UtilityReading[];
  unit: string;
  color: string;
}

export default function ConsumptionChart({
  data,
  unit,
  color,
}: ConsumptionChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => monthSortKey(a.month).localeCompare(monthSortKey(b.month)))
        .map((reading) => ({
          ...reading,
          monthLabel: formatMonthLabel(reading.month),
        })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
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
          formatter={(value: number) => [`${value} ${unit}`, 'Потребление']}
        />
        <Line
          type="monotone"
          dataKey="consumption"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
