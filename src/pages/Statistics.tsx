import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Activity,
  Search,
  Lightbulb,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import type { Activity as ActivityType, FilterType, PieChartData, TrendDataPoint, HeatmapDay, Gap } from '@/types';
import { useActivities } from '@/hooks/useActivities';
import { useInsights } from '@/hooks/useInsights';
import { useSettings } from '@/context/SettingsContext';
import { useOverrides } from '@/context/OverridesContext';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { ActivityFilter } from '@/components/activity/ActivityFilter';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { ActivityPieChart } from '@/components/charts/ActivityPieChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap';
import { ActivityForm } from '@/components/forms/ActivityForm';
import {
  Card,
  StatCard,
  LoadingSpinner,
  ErrorAlert,
  Modal,
  SuccessAnimation,
  cn,
  Skeleton,
} from '@/components/ui';
import { todayDate, formatDate, formatDuration, formatDateShort, lastNDays, getDayLabel, compareTime, calcDuration, currentTime, formatTime12h } from '@/utils/timeUtils';
import { scoreLabel, scoreColor } from '@/utils/insights';
import { useLoading } from '@/context/LoadingContext';

export function Statistics() {
  const { settings } = useSettings();
  const { updateOverride, clearOverride, isLoading: isOverridesLoading } = useOverrides();
  const { isSyncing } = useLoading();
  const [selectedDate, setSelectedDate] = useState(() => todayDate(settings.wakeUpTime));
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const schedule = useSleepSchedule(selectedDate);
  const activeWakeUp = schedule.wakeUpTime;
  const activeBedtime = schedule.bedtime;
  const isOverridden = schedule.isOverridden;

  const [wakeUpTime, setWakeUpTime] = useState(activeWakeUp);
  const [bedtime, setBedtime] = useState(activeBedtime);

  // Sync local state when selectedDate changes or overrides load
  useEffect(() => {
    setWakeUpTime(activeWakeUp);
    setBedtime(activeBedtime);
  }, [activeWakeUp, activeBedtime]);

  const handleSaveSchedule = async () => {
    await updateOverride(selectedDate, wakeUpTime, bedtime);
    setShowScheduleModal(false);
  };

  const handleClearOverride = async () => {
    await clearOverride(selectedDate);
    setShowScheduleModal(false);
  };

  const {
    activities,
    recentActivities,
    allActivities,
    isLoading,
    isSaving,
    error,
    refetchByDate,
    refetchRecent,
    updateActivity,
    deleteActivity,
    clearError,
  } = useActivities({ date: selectedDate });

  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEditSave = async (activity: ActivityType) => {
    const success = await updateActivity(activity);
    if (success) {
      setEditingActivity(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
    return success;
  };

  const { insights, stats } = useInsights(activities, selectedDate);

  // Fetch on date change
  useEffect(() => {
    refetchByDate(selectedDate);
  }, [selectedDate, refetchByDate]);

  // Fetch recent for heatmap + trend on mount
  useEffect(() => {
    refetchRecent(30);
  }, [refetchRecent]);

  // ── Filter + Search ───────────────────────────────────────

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (filter !== 'All') {
      result = result.filter(a => a.category === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activities, filter, searchQuery]);

  // ── Timeline with Gaps ────────────────────────────────────

  const timelineItems = useMemo(() => {
    // 1. Sort activities by start time (ascending to calculate gaps) logically relative to wakeUpTime
    const sorted = [...filteredActivities].sort((a, b) => compareTime(a.startTime, b.startTime, wakeUpTime));
    const items: (ActivityType | Gap)[] = [];
    
    // Only generate gaps if viewing all activities without search
    const shouldGenerateGaps = filter === 'All' && !searchQuery.trim();

    let currentTimePointer = wakeUpTime;

    sorted.forEach((activity, index) => {
      // If there's a gap before this activity
      if (shouldGenerateGaps && compareTime(currentTimePointer, activity.startTime, wakeUpTime) < 0) {
        const dur = calcDuration(currentTimePointer, activity.startTime, wakeUpTime);
        if (dur > settings.minUntrackedGapMinutes) {
          items.push({
            isGap: true,
            id: `gap-${index}`,
            startTime: currentTimePointer,
            endTime: activity.startTime,
            durationMinutes: dur,
          });
        }
      }
      
      items.push(activity);
      
      // Update pointer. If activities overlap, take the latest end time logically.
      if (compareTime(currentTimePointer, activity.endTime, wakeUpTime) < 0) {
        currentTimePointer = activity.endTime;
      }
    });

    if (shouldGenerateGaps) {
      // Determine the end bound: either current time (if today) or bedtime
      const now = currentTime();
      const isToday = selectedDate === todayDate(wakeUpTime);
      
      // If today and now is before bedtime, use now as the bound. Otherwise use bedtime.
      let endBound = bedtime;
      if (isToday && compareTime(now, bedtime, wakeUpTime) < 0) {
        endBound = now;
      }
      
      // If pointer hasn't reached the end bound yet, add a final gap
      if (compareTime(currentTimePointer, endBound, wakeUpTime) < 0) {
        const dur = calcDuration(currentTimePointer, endBound, wakeUpTime);
        if (dur > settings.minUntrackedGapMinutes) {
          items.push({
            isGap: true,
            id: 'gap-end',
            startTime: currentTimePointer,
            endTime: endBound,
            durationMinutes: dur,
          });
        }
      }
    }

    // Return descending (most recent first) for display
    return items.reverse();
  }, [filteredActivities, wakeUpTime, bedtime, selectedDate, filter, searchQuery, settings.minUntrackedGapMinutes]);

  // ── Filter counts ─────────────────────────────────────────

  const filterCounts = useMemo<Record<FilterType, number>>(() => ({
    All:      activities.length,
    Positive: activities.filter(a => a.category === 'Positive').length,
    Neutral:  activities.filter(a => a.category === 'Neutral').length,
    Negative: activities.filter(a => a.category === 'Negative').length,
  }), [activities]);

  // ── Pie chart data ────────────────────────────────────────

  const pieData: PieChartData[] = [
    { name: 'Positive', value: stats.positiveMinutes, color: '#22c55e' },
    { name: 'Neutral',  value: stats.neutralMinutes,  color: '#64748b' },
    { name: 'Negative', value: stats.negativeMinutes, color: '#ef4444' },
  ];

  // ── Trend data (last 7 days) ──────────────────────────────

  const trendData = useMemo<TrendDataPoint[]>(() => {
    const days = lastNDays(7).reverse();
    return days.map(date => {
      const dayActivities = recentActivities.filter(a => a.date === date);
      return {
        date: formatDateShort(date),
        positive: dayActivities.filter(a => a.category === 'Positive').reduce((s, a) => s + a.durationMinutes, 0),
        neutral:  dayActivities.filter(a => a.category === 'Neutral').reduce((s, a) => s + a.durationMinutes, 0),
        negative: dayActivities.filter(a => a.category === 'Negative').reduce((s, a) => s + a.durationMinutes, 0),
      };
    });
  }, [recentActivities]);

  // ── Heatmap data ──────────────────────────────────────────

  const heatmapData = useMemo<HeatmapDay[]>(() => {
    const map = new Map<string, HeatmapDay>();
    recentActivities.forEach(a => {
      const existing = map.get(a.date);
      if (existing) {
        existing.count++;
        existing.totalMinutes += a.durationMinutes;
      } else {
        map.set(a.date, { date: a.date, count: 1, totalMinutes: a.durationMinutes });
      }
    });
    return Array.from(map.values());
  }, [recentActivities]);

  // ── Productivity score ────────────────────────────────────

  const scoreCol = scoreColor(stats.productivityScore);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-brand shadow-glow">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Statistics</h1>
              {isSyncing && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{formatDate(selectedDate)}</p>
          </div>
        </div>

        {/* Date picker */}
        <input
          id="stats-date-picker"
          type="date"
          value={selectedDate}
          max={todayDate(wakeUpTime)}
          onChange={e => {
            const val = e.target.value;
            if (val > todayDate(wakeUpTime)) {
              setSelectedDate(todayDate(wakeUpTime));
            } else {
              setSelectedDate(val);
            }
          }}
          className={cn(
            'bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2',
            'focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 outline-none',
            'dark:[color-scheme:dark] transition-all duration-250'
          )}
        />
      </div>

      {/* Error */}
      {error && <ErrorAlert error={error} onDismiss={clearError} />}

      {/* Loading Skeleton */}
      {(isLoading && allActivities.length === 0) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )}

      {(!isLoading || allActivities.length > 0) && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              label="Activities"
              value={stats.totalActivities}
              icon={<Activity className="w-4 h-4 text-brand-400" />}
            />
            <StatCard
              label="Total Time"
              value={formatDuration(stats.totalMinutes)}
              icon={<Clock className="w-4 h-4 text-slate-400" />}
            />
            <StatCard
              label="Positive"
              value={`${stats.positivePercent}%`}
              subValue={formatDuration(stats.positiveMinutes)}
              icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
              accent="text-green-400"
            />
            <StatCard
              label="Neutral"
              value={`${stats.neutralPercent}%`}
              subValue={formatDuration(stats.neutralMinutes)}
              icon={<MinusCircle className="w-4 h-4 text-slate-400" />}
              accent="text-slate-400"
            />
            <StatCard
              label="Negative"
              value={`${stats.negativePercent}%`}
              subValue={formatDuration(stats.negativeMinutes)}
              icon={<XCircle className="w-4 h-4 text-red-400" />}
              accent="text-red-400"
            />
          </div>

          {/* Productivity Score */}
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Daily Productivity Score
                </p>
                <p className="text-4xl font-black" style={{ color: scoreCol }}>
                  {stats.productivityScore}
                  <span className="text-lg font-medium text-slate-500 ml-1">/ 100</span>
                </p>
                <p className="text-sm mt-1" style={{ color: scoreCol }}>
                  {scoreLabel(stats.productivityScore)}
                </p>
              </div>

              {/* Score bar */}
              <div className="flex-1 min-w-[160px]">
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${stats.productivityScore}%`,
                      backgroundColor: scoreCol,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-1">Time Distribution</h2>
              <p className="text-xs text-slate-500 mb-4">Based on minutes logged, not activity count</p>
              <ActivityPieChart data={pieData} totalMinutes={stats.totalMinutes} />
            </Card>

            {/* Insights */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-semibold text-slate-300">Daily Insights</h2>
              </div>
              {insights.length > 0 ? (
                <ul className="space-y-3">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Log some activities for this date to see insights.
                </p>
              )}
            </Card>
          </div>

          {/* 7-Day Trend */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-300">7-Day Trend</h2>
              <span className="ml-auto text-xs text-slate-500">Minutes per day</span>
            </div>
            <TrendChart data={trendData} />
          </Card>

          {/* Activity log section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Activity Log</h2>

              {/* Search */}
              <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="activity-search"
                    type="text"
                    placeholder="Search activities…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white',
                      'placeholder:text-slate-500 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30',
                      'outline-none transition-all duration-250'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4">
              <ActivityFilter
                active={filter}
                onChange={setFilter}
                counts={filterCounts}
              />
            </div>

            {/* Daily Schedule Card */}
            <div className="mb-6">
              <Card hover onClick={() => setShowScheduleModal(true)} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                       <Clock className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Sleep Schedule {isOverridden && <span className="ml-1 text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Override</span>}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Wake-up: <span className="font-medium text-slate-300">{formatTime12h(activeWakeUp)}</span> &bull; Bedtime: <span className="font-medium text-slate-300">{formatTime12h(activeBedtime)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                    <span className="text-xs font-medium hidden sm:inline-block">Edit</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Timeline */}
            <div className="mb-3 px-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Timeline</span>
            </div>
            <ActivityTimeline
              items={timelineItems}
              emptyMessage={
                activities.length === 0
                  ? 'No activities logged for this date.'
                  : 'No activities match your search/filter.'
              }
              onEdit={setEditingActivity}
              onDelete={deleteActivity}
            />
          </div>

          {/* Calendar Heatmap */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-300">Logging Consistency</h2>
              <span className="ml-auto text-xs text-slate-500">Last 30 days</span>
            </div>
            <CalendarHeatmap data={heatmapData} days={30} />
          </Card>
        </>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        title="Edit Activity"
      >
        {editingActivity && (
          <ActivityForm
            initialData={editingActivity}
            onSave={handleEditSave}
            isSaving={isSaving}
          />
        )}
      </Modal>

      {/* Schedule Edit Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          // Revert local state if cancelled
          setWakeUpTime(activeWakeUp);
          setBedtime(activeBedtime);
        }}
        title={`Edit Schedule for ${formatDateShort(selectedDate)}`}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Wake-up Time
              </label>
              <input
                type="time"
                value={wakeUpTime}
                onChange={e => setWakeUpTime(e.target.value)}
                className="w-full bg-white/5 text-white text-sm rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Bedtime
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={e => setBedtime(e.target.value)}
                className="w-full bg-white/5 text-white text-sm rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all dark:[color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-6">
            <div>
              {isOverridden && (
                <button
                  onClick={handleClearOverride}
                  disabled={isOverridesLoading}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-all"
                >
                  Clear Override
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setWakeUpTime(activeWakeUp);
                  setBedtime(activeBedtime);
                }}
                disabled={isOverridesLoading}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={isOverridesLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow disabled:opacity-50"
              >
                {isOverridesLoading ? 'Saving...' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Success Toast */}
      <SuccessAnimation show={showSuccess} message="Activity updated successfully!" />
    </div>
  );
}
