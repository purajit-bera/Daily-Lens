import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { TrendDataPoint } from '@/types';

interface TrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-dark-bg-3 border border-white/10 rounded-xl px-4 py-3 shadow-glass">
      <p className="text-xs font-semibold text-slate-300 mb-2">{label}</p>
      {payload.map(({ name, value, color }) => (
        <div key={name} className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span>{name}:</span>
          <span className="text-white font-medium">{value} min</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={8} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="positive" name="Positive" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="neutral"  name="Neutral"  fill="#64748b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="negative" name="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
