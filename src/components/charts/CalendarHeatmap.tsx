import { useMemo } from 'react';
import type { HeatmapDay } from '@/types';
import { cn } from '@/components/ui';
import { formatDateShort, getDayLabel } from '@/utils/timeUtils';

interface CalendarHeatmapProps {
  data: HeatmapDay[];
  days?: number;
}

function getColor(count: number): string {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-brand-900/60';
  if (count <= 3) return 'bg-brand-700/70';
  if (count <= 6) return 'bg-brand-500/80';
  return 'bg-brand-400';
}

export function CalendarHeatmap({ data, days = 30 }: CalendarHeatmapProps) {
  const cells = useMemo(() => {
    const map = new Map(data.map(d => [d.date, d]));
    const result: { date: string; count: number; totalMinutes: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = map.get(dateStr);
      result.push({
        date: dateStr,
        count: entry?.count ?? 0,
        totalMinutes: entry?.totalMinutes ?? 0,
      });
    }
    return result;
  }, [data, days]);

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {cells.map(({ date, count, totalMinutes }) => (
          <div key={date} className="relative group">
            <div
              className={cn(
                'w-5 h-5 rounded-sm transition-all duration-150 cursor-default',
                getColor(count)
              )}
              title={`${formatDateShort(date)}: ${count} activities, ${totalMinutes} min`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 rounded-lg bg-dark-bg-3 border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-glass">
              <p className="font-medium">{formatDateShort(date)}</p>
              <p className="text-slate-400">{count} activit{count !== 1 ? 'ies' : 'y'}</p>
              {totalMinutes > 0 && <p className="text-slate-400">{totalMinutes} min</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
        <span>Less</span>
        {[0, 1, 3, 5, 7].map(n => (
          <div
            key={n}
            className={cn('w-4 h-4 rounded-sm', getColor(n))}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
