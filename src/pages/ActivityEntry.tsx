import { useState } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import type { Activity as ActivityType } from '@/types';
import { useActivities } from '@/hooks/useActivities';
import { ActivityForm } from '@/components/forms/ActivityForm';
import { SuccessAnimation, ErrorAlert, Card } from '@/components/ui';
import { todayDate, formatDate, compareTime, formatTime12h, calcEndTime, calcDuration } from '@/utils/timeUtils';
import { OverlapDialog } from '@/components/activity/OverlapDialog';
import { useSettings } from '@/context/SettingsContext';

import { QuickTips } from '@/components/tips/QuickTips';

export function ActivityEntry() {
  const { settings } = useSettings();
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Overlap state
  const [pendingActivity, setPendingActivity] = useState<ActivityType | null>(null);
  const [conflictActivity, setConflictActivity] = useState<ActivityType | null>(null);

  const today = todayDate(settings.wakeUpTime);

  const { isSaving, error, saveActivity, clearError, activities } = useActivities({
    date: today,
    autoFetch: true,
  });

  // Most recent activity today
  const lastActivity = activities.length > 0 
    ? [...activities].sort((a, b) => compareTime(b.startTime, a.startTime, settings.wakeUpTime))[0] 
    : null;

  const performSave = async (activity: ActivityType) => {
    const success = await saveActivity(activity);
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      setPendingActivity(null);
      setConflictActivity(null);
    }
    return success;
  };

  const handleSave = async (activity: ActivityType): Promise<boolean> => {
    // Check for overlaps logically anchoring to wakeUpTime
    const overlap = activities.find(a => {
      const aStart = compareTime(a.startTime, a.endTime, settings.wakeUpTime) < 0 ? a.startTime : a.endTime;
      const aEnd = compareTime(a.startTime, a.endTime, settings.wakeUpTime) > 0 ? a.startTime : a.endTime;
      return compareTime(activity.startTime, aEnd, settings.wakeUpTime) < 0 && compareTime(activity.endTime, aStart, settings.wakeUpTime) > 0;
    });

    if (overlap) {
      setPendingActivity(activity);
      setConflictActivity(overlap);
      return false; // Prevent form from clearing/saving yet
    }

    return performSave(activity);
  };

  const handleResolveAuto = () => {
    if (!pendingActivity || !conflictActivity) return;
    const aEnd = compareTime(conflictActivity.startTime, conflictActivity.endTime, settings.wakeUpTime) > 0 
      ? conflictActivity.startTime 
      : conflictActivity.endTime;
      
    const adjustedStart = calcEndTime(aEnd, 1);
    const adjustedEnd = pendingActivity.endTime;
    const recalculatedDuration = calcDuration(adjustedStart, adjustedEnd, settings.wakeUpTime);
    
    performSave({
      ...pendingActivity,
      startTime: adjustedStart,
      endTime: adjustedEnd,
      durationMinutes: recalculatedDuration,
    });
  };

  const handleResolveKeep = () => {
    if (!pendingActivity) return;
    performSave(pendingActivity);
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-brand shadow-glow">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Log Activity</h1>
            <p className="text-sm text-slate-400">{formatDate(today)}</p>
          </div>
        </div>

        <QuickTips />

        {/* Last Activity Context */}
        {lastActivity && (
          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-fade-in">
            <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Last Activity Today</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium line-clamp-1" dangerouslySetInnerHTML={{ __html: lastActivity.description }} />
                <p className="text-xs text-slate-400 mt-1">
                  {formatTime12h(lastActivity.startTime)} → {formatTime12h(lastActivity.endTime)} · {lastActivity.durationMinutes}m
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${lastActivity.category === 'Positive' ? 'text-green-400 border-green-500/30 bg-green-500/10' : lastActivity.category === 'Negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-300 border-slate-500/30 bg-slate-500/10'}`}>
                {lastActivity.category}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error from save */}
      {error && <div className="mb-4"><ErrorAlert error={error} onDismiss={clearError} /></div>}

      {/* Form */}
      <ActivityForm onSave={handleSave} isSaving={isSaving} />

      {/* Success toast */}
      <SuccessAnimation show={showSuccess} message="Activity saved to Google Sheets!" />

      {/* Overlap Dialog */}
      <OverlapDialog
        isOpen={!!pendingActivity}
        conflictingActivity={conflictActivity}
        proposedActivity={pendingActivity}
        onResolveAuto={handleResolveAuto}
        onResolveKeep={handleResolveKeep}
        onCancel={() => {
          setPendingActivity(null);
          setConflictActivity(null);
        }}
      />
    </div>
  );
}
