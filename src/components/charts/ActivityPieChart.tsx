import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PieChartData } from '@/types';
import { formatDuration } from '@/utils/timeUtils';

interface ActivityPieChartProps {
  data: PieChartData[];
  totalMinutes: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieChartData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  const total = payload[0].payload as unknown as { total?: number };
  return (
    <div className="bg-dark-bg-3 border border-white/10 rounded-xl px-4 py-3 shadow-glass">
      <p className="text-sm font-medium text-white">{name}</p>
      <p className="text-xs text-slate-400">{formatDuration(value)}</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ color: string; value: string }> }) {
  if (!payload) return null;
  return (
    <div className="flex justify-center gap-4 mt-2 flex-wrap">
      {payload.map(({ color, value }) => (
        <div key={value} className="flex items-center gap-1.5 text-xs text-slate-400">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {value}
        </div>
      ))}
    </div>
  );
}

export function ActivityPieChart({ data, totalMinutes }: ActivityPieChartProps) {
  const nonZero = data.filter(d => d.value > 0);

  if (nonZero.length === 0 || totalMinutes === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={nonZero}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          strokeWidth={0}
        >
          {nonZero.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          content={({ payload }) => (
            <CustomLegend payload={payload as Array<{ color: string; value: string }>} />
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
