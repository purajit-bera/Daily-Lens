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
} from '@/components/ui';
import { todayDate, formatDate, formatDuration, formatDateShort, lastNDays, getDayLabel, compareTime, calcDuration, currentTime } from '@/utils/timeUtils';
import { scoreLabel, scoreColor } from '@/utils/insights';

export function Statistics() {
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { settings, updateSetting } = useSettings();
  const [wakeUpTime, setWakeUpTime] = useState(settings.wakeUpTime);
  const [bedtime, setBedtime] = useState(settings.bedtime);

  // Sync local state when settings load
  useEffect(() => {
    setWakeUpTime(settings.wakeUpTime);
    setBedtime(settings.bedtime);
  }, [settings.wakeUpTime, settings.bedtime]);

  // Persist to settings context when changed locally
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (wakeUpTime !== settings.wakeUpTime) updateSetting('wakeUpTime', wakeUpTime);
      if (bedtime !== settings.bedtime) updateSetting('bedtime', bedtime);
    }, 500); // debounce
    return () => clearTimeout(timeoutId);
  }, [wakeUpTime, bedtime, settings.wakeUpTime, settings.bedtime, updateSetting]);

  const {
    activities,
    recentActivities,
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
    // 1. Sort activities by start time (ascending to calculate gaps)
    const sorted = [...filteredActivities].sort((a, b) => compareTime(a.startTime, b.startTime));
    const items: (ActivityType | Gap)[] = [];
    
    // Only generate gaps if viewing all activities without search
    const shouldGenerateGaps = filter === 'All' && !searchQuery.trim();

    let currentTimePointer = wakeUpTime;

    sorted.forEach((activity, index) => {
      // If there's a gap before this activity
      if (shouldGenerateGaps && compareTime(currentTimePointer, activity.startTime) < 0) {
        const dur = calcDuration(currentTimePointer, activity.startTime);
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
      
      // Update pointer. If activities overlap, take the latest end time.
      if (compareTime(currentTimePointer, activity.endTime) < 0) {
        currentTimePointer = activity.endTime;
      }
    });

    if (shouldGenerateGaps) {
      // Determine the end bound: either current time (if today) or bedtime
      const now = currentTime();
      const isToday = selectedDate === todayDate();
      
      // If today and now is before bedtime, use now as the bound. Otherwise use bedtime.
      let endBound = bedtime;
      if (isToday && compareTime(now, bedtime) < 0) {
        endBound = now;
      }
      
      // If pointer hasn't reached the end bound yet, add a final gap
      if (compareTime(currentTimePointer, endBound) < 0) {
        const dur = calcDuration(currentTimePointer, endBound);
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
  }, [filteredActivities, wakeUpTime, bedtime, selectedDate, filter, searchQuery]);

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
            <h1 className="text-2xl font-bold text-white">Statistics</h1>
            <p className="text-sm text-slate-400">{formatDate(selectedDate)}</p>
          </div>
        </div>

        {/* Date picker */}
        <input
          id="stats-date-picker"
          type="date"
          value={selectedDate}
          max={todayDate()}
          onChange={e => {
            const val = e.target.value;
            if (val > todayDate()) {
              setSelectedDate(todayDate());
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

      {/* Loading */}
      {isLoading && (
        <div className="py-16">
          <LoadingSpinner size="lg" label="Loading your activities…" />
        </div>
      )}

      {!isLoading && (
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
            <div className="flex items-center flex-wrap gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Activity Log</h2>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs">
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

            {/* Timeline */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-slate-500">Timeline</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Wake-up:</span>
                  <input
                    type="time"
                    value={wakeUpTime}
                    onChange={e => setWakeUpTime(e.target.value)}
                    className="bg-transparent text-slate-400 text-xs rounded border border-white/10 px-1 outline-none dark:[color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Bedtime:</span>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={e => setBedtime(e.target.value)}
                    className="bg-transparent text-slate-400 text-xs rounded border border-white/10 px-1 outline-none dark:[color-scheme:dark]"
                  />
                </div>
              </div>
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

      {/* Success Toast */}
      <SuccessAnimation show={showSuccess} message="Activity updated successfully!" />
    </div>
  );
}
