import type { FilterType } from '@/types';
import { cn } from '@/components/ui';

interface ActivityFilterProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

const FILTERS: { value: FilterType; label: string; emoji: string }[] = [
  { value: 'All',      label: 'All',      emoji: '📋' },
  { value: 'Positive', label: 'Positive', emoji: '🟢' },
  { value: 'Neutral',  label: 'Neutral',  emoji: '⚪' },
  { value: 'Negative', label: 'Negative', emoji: '🔴' },
];

const activeClasses: Record<FilterType, string> = {
  All:      'bg-brand-500 text-white border-brand-500',
  Positive: 'bg-green-500 text-white border-green-500',
  Neutral:  'bg-slate-500 text-white border-slate-500',
  Negative: 'bg-red-500 text-white border-red-500',
};

export function ActivityFilter({ active, onChange, counts }: ActivityFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter activities"
    >
      {FILTERS.map(({ value, label, emoji }) => {
        const isActive = active === value;
        const count = counts[value] ?? 0;
        return (
          <button
            key={value}
            id={`filter-${value.toLowerCase()}`}
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium border transition-all duration-250',
              isActive
                ? activeClasses[value]
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            )}
            aria-pressed={isActive}
          >
            <span>{emoji}</span>
            {label}
            <span
              className={cn(
                'ml-0.5 px-1.5 py-0.5 rounded-full text-xs',
                isActive ? 'bg-white/20' : 'bg-white/10'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
