import type { Activity, Gap } from '@/types';
import { EmptyState, Card } from '@/components/ui';
import { ActivityCard } from './ActivityCard';
import { formatTime12h, formatDuration } from '@/utils/timeUtils';
import { ClipboardList, Clock } from 'lucide-react';

interface ActivityTimelineProps {
  items: (Activity | Gap)[];
  emptyMessage?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string, createdAt: string) => void;
}

export function ActivityTimeline({ items, emptyMessage, onEdit, onDelete }: ActivityTimelineProps) {
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
              className="p-3 border border-dashed border-white/10 bg-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                <span>{formatTime12h(item.startTime)}</span>
                <span className="text-slate-600">→</span>
                <span>{formatTime12h(item.endTime)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-xl bg-black/20 text-slate-500 font-medium">
                  {formatDuration(item.durationMinutes)}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  ⚪ No activity recorded
                </span>
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
