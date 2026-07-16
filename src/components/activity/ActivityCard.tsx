import type { Activity } from '@/types';
import { Card, Badge, cn } from '@/components/ui';
import { formatTime12h, formatDuration } from '@/utils/timeUtils';
import { Clock, Edit2, Trash2 } from 'lucide-react';

interface ActivityCardProps {
  activity: Activity;
  className?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string, createdAt: string) => void;
}

const categoryBorderColor: Record<Activity['category'], string> = {
  Positive: 'border-l-green-500',
  Neutral: 'border-l-slate-500',
  Negative: 'border-l-red-500',
};

const categoryDotColor: Record<Activity['category'], string> = {
  Positive: 'bg-green-400',
  Neutral: 'bg-slate-400',
  Negative: 'bg-red-400',
};

export function ActivityCard({ activity, className, onEdit, onDelete }: ActivityCardProps) {
  return (
    <Card
      className={cn(
        'p-4 border-l-4 transition-all duration-250 hover:bg-white/8 relative group',
        categoryBorderColor[activity.category],
        className
      )}
    >
      {/* Action Buttons (visible on hover) */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {onEdit && (
          <button
            onClick={() => onEdit(activity)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Edit Activity"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this activity?')) {
                onDelete(activity.id, activity.createdAt);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete Activity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3 pr-16">
        {/* Time range */}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="font-medium">
            {formatTime12h(activity.startTime)}
          </span>
          <span className="text-slate-600">→</span>
          <span className="font-medium">
            {formatTime12h(activity.endTime)}
          </span>
        </div>

        {/* Duration + Category */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-xl bg-white/8 text-slate-400 font-medium">
            {formatDuration(activity.durationMinutes)}
          </span>
          <Badge variant={activity.category} dot>
            {activity.category}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <div
        className={cn(
          'text-sm text-slate-300 leading-relaxed',
          'prose prose-invert prose-sm max-w-none',
          'prose-p:my-0.5 prose-ul:my-1 prose-li:my-0',
          '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
        )}
        dangerouslySetInnerHTML={{ __html: activity.description }}
      />
    </Card>
  );
}
