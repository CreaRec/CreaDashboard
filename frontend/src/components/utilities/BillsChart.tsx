import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMonthLabel } from '../../lib/formatMonth';

export interface BillReading {
  month: string;
  amount: number;
}

interface BillsChartProps {
  data: BillReading[];
  currency: string;
  color: string;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export default function BillsChart({ data, currency, color }: BillsChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((reading) => ({
          ...reading,
          monthLabel: formatMonthLabel(reading.month),
        })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
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
          tickFormatter={(value: number) =>
            currency === 'USD' ? `$${value}` : `${value}`
          }
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          formatter={(value: number) => [formatAmount(value, currency), 'Счёт']}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
