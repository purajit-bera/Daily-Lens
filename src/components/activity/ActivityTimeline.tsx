import type { Activity, Gap } from '@/types';
import { EmptyState, Card } from '@/components/ui';
import { ActivityCard } from './ActivityCard';
import { formatTime12h, formatDuration } from '@/utils/timeUtils';
import { ClipboardList, Clock, Plus } from 'lucide-react';

interface ActivityTimelineProps {
  items: (Activity | Gap)[];
  emptyMessage?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string, createdAt: string) => void;
  onAddGapActivity?: (gap: Gap) => void;
}

export function ActivityTimeline({ items, emptyMessage, onEdit, onDelete, onAddGapActivity }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="w-8 h-8" />}
        title="No activities yet"
        description={emptyMessage ?? 'Log your first activity to see it here.'}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        if ('isGap' in item) {
          return (
            <Card
              key={item.id}
              onClick={() => onAddGapActivity?.(item)}
              hover={!!onAddGapActivity}
              className={`p-3.5 border border-dashed border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-white/10 ${onAddGapActivity ? 'cursor-pointer group' : ''}`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{formatTime12h(item.startTime)}</span>
                  <span className="text-slate-600">→</span>
                  <span>{formatTime12h(item.endTime)}</span>
                </div>
                <div className="text-xs font-medium text-slate-500 sm:pl-6">
                  Duration: {formatDuration(item.durationMinutes)}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1 sm:mt-0 sm:pl-0 pl-6">
                <div className="text-sm font-semibold text-slate-400">
                  No Activity Recorded
                </div>
                {onAddGapActivity && (
                  <button className="flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 px-4 py-2 rounded-lg transition-colors opacity-80 group-hover:opacity-100 group-hover:bg-brand-500/20">
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                  </button>
                )}
              </div>
            </Card>
          );
        }

        return (
          <ActivityCard
            key={item.id}
            activity={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
