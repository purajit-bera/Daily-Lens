import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Activity,
  Search,
  Sparkles,
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
import { OverlapDialog } from '@/components/activity/OverlapDialog';
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
import { todayDate, formatDate, formatDuration, formatDateShort, lastNDays, compareTime, calcDuration, currentTime, formatTime12h, calcEndTime } from '@/utils/timeUtils';
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
    saveActivity,
    updateActivity,
    deleteActivity,
    clearError,
  } = useActivities({ date: selectedDate });

  // Mobile collapse state
  const [showDetails, setShowDetails] = useState(() => {
    return localStorage.getItem('dal_mobile_details_expanded') === 'true';
  });
  const [showInsights, setShowInsights] = useState(() => {
    return localStorage.getItem('dal_mobile_insights_expanded') === 'true';
  });

  const toggleDetails = () => {
    setShowDetails(s => {
      const v = !s;
      localStorage.setItem('dal_mobile_details_expanded', v.toString());
      return v;
    });
  };

  const toggleInsights = () => {
    setShowInsights(s => {
      const v = !s;
      localStorage.setItem('dal_mobile_insights_expanded', v.toString());
      return v;
    });
  };

  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [addingGapActivity, setAddingGapActivity] = useState<Gap | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Overlap state
  const [pendingActivity, setPendingActivity] = useState<ActivityType | null>(null);
  const [conflictActivity, setConflictActivity] = useState<ActivityType | null>(null);
  const [isPendingEdit, setIsPendingEdit] = useState(false);

  const performSave = async (activity: ActivityType, isEdit: boolean) => {
    const success = await (isEdit ? updateActivity(activity) : saveActivity(activity));
    if (success) {
      if (isEdit) {
        setEditingActivity(null);
      } else {
        setAddingGapActivity(null);
      }
      setPendingActivity(null);
      setConflictActivity(null);
      setIsPendingEdit(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
    return success;
  };

  const checkOverlapAndSave = async (activity: ActivityType, isEdit: boolean) => {
    const overlap = activities.find(a => {
      if (isEdit && a.id === activity.id) return false;
      const aStart = compareTime(a.startTime, a.endTime, wakeUpTime) < 0 ? a.startTime : a.endTime;
      const aEnd = compareTime(a.startTime, a.endTime, wakeUpTime) > 0 ? a.startTime : a.endTime;
      return compareTime(activity.startTime, aEnd, wakeUpTime) < 0 && compareTime(activity.endTime, aStart, wakeUpTime) > 0;
    });

    if (overlap) {
      setPendingActivity(activity);
      setConflictActivity(overlap);
      setIsPendingEdit(isEdit);
      return false; // Prevent form from closing
    }

    return performSave(activity, isEdit);
  };

  const handleEditSave = async (activity: ActivityType) => checkOverlapAndSave(activity, true);
  const handleAddSave = async (activity: ActivityType) => checkOverlapAndSave(activity, false);

  const handleResolveAuto = () => {
    if (!pendingActivity || !conflictActivity) return;
    const aEnd = compareTime(conflictActivity.startTime, conflictActivity.endTime, wakeUpTime) > 0 
      ? conflictActivity.startTime 
      : conflictActivity.endTime;
      
    const adjustedStart = calcEndTime(aEnd, 1);
    const adjustedEnd = pendingActivity.endTime;
    const recalculatedDuration = calcDuration(adjustedStart, adjustedEnd, wakeUpTime);
    
    performSave({
      ...pendingActivity,
      startTime: adjustedStart,
      endTime: adjustedEnd,
      durationMinutes: recalculatedDuration,
    }, isPendingEdit);
  };

  const handleResolveKeep = () => {
    if (!pendingActivity) return;
    performSave(pendingActivity, isPendingEdit);
  };

  const { insights, stats } = useInsights(activities, recentActivities, selectedDate);

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

  const b = stats.scoreBreakdown;
  const scoreCol = scoreColor(b.finalScore);

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

          {/* Productivity Score Breakdown */}
          <Card className="p-5">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Score Column */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Daily Score
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-5xl font-black tracking-tight" style={{ color: scoreCol }}>
                    {b.finalScore}
                  </p>
                  <span className="text-xl font-semibold text-slate-500">/ 100</span>
                </div>
                
                {/* Score bar */}
                <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-6">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${b.finalScore}%`, backgroundColor: scoreCol }}
                  />
                </div>

                <div className={`space-y-4 md:block overflow-hidden transition-all duration-300 ${showDetails ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100 md:mt-0'}`}>
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h3 className="text-base font-bold text-white mb-1">{b.feedbackTitle}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {b.feedbackMessage}
                    </p>
                    
                    {b.feedbackSuggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">How to improve tomorrow</p>
                        <ul className="space-y-2">
                          {b.feedbackSuggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-brand-400 font-bold">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile Toggle */}
                <button 
                  onClick={toggleDetails}
                  className="w-full mt-2 flex md:hidden items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  {showDetails ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Hide Details</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show Details</>
                  )}
                </button>
              </div>

              {/* Breakdown Column */}
              <div className={`flex-1 min-w-[250px] space-y-4 md:block overflow-hidden transition-all duration-300 ${showDetails ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100 md:mt-0'}`}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Score Breakdown
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Maximum Possible Today</span>
                    <span className="font-bold text-white">{b.maxPossibleScore}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Positive Goal</span>
                    <div className="text-right">
                      <span className="font-medium text-white">{formatDuration(b.positiveMinutes)} / {formatDuration(b.positiveGoalMinutes)}</span>
                      <span className="text-slate-500 ml-1">({b.completionPct}%)</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Neutral Time</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{formatDuration(b.neutralMinutes)}</span>
                      {b.neutralPenalty > 0 ? (
                         <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase font-semibold">Over Limit</span>
                      ) : (
                         <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded uppercase font-semibold">Within Limit</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Negative Time</span>
                    <span className="font-medium text-white">{formatDuration(b.negativeMinutes)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Reason for Lost Points
                  </p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {b.negativePenalty > 0 && (
                      <li className="flex justify-between items-center">
                        <span className="text-red-400">-{b.negativePenalty} Maximum Score (Negative Activities)</span>
                      </li>
                    )}
                    {b.neutralPenalty > 0 && (
                      <li className="flex justify-between items-center">
                        <span className="text-orange-400">-{b.neutralPenalty} Maximum Score (Excess Neutral Time)</span>
                      </li>
                    )}
                    {b.completionPct < 100 && (
                      <li className="flex justify-between items-center">
                        <span className="text-slate-300">{b.completionPct}% Positive Goal Completed</span>
                      </li>
                    )}
                    {b.maxPossibleScore === 100 && b.completionPct === 100 && (
                      <li className="flex justify-between items-center">
                        <span className="text-green-400">Perfect Score! No points lost.</span>
                      </li>
                    )}
                  </ul>
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

            {/* Smart Insights */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold text-slate-300">🧠 Smart Insights</h2>
                </div>
                <div className="md:hidden">
                  <span className="text-xs text-slate-500 font-medium">{insights.length} Insights Available</span>
                </div>
              </div>
              
              <div className={`md:block overflow-hidden transition-all duration-300 ${showInsights ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100 md:mt-0'}`}>
                {insights.length > 0 ? (
                  <ul className="space-y-3">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    Log some activities for this date to see behavioral insights.
                  </p>
                )}
              </div>
              
              {/* Mobile Toggle */}
              <button 
                onClick={toggleInsights}
                className="w-full mt-4 flex md:hidden items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                {showInsights ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Hide Insights</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Show Insights</>
                )}
              </button>
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
              onAddGapActivity={setAddingGapActivity}
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
            context="statistics"
            initialData={editingActivity}
            onSave={handleEditSave}
            isSaving={isSaving}
          />
        )}
      </Modal>

      {/* Add Gap Modal */}
      <Modal
        isOpen={!!addingGapActivity}
        onClose={() => setAddingGapActivity(null)}
        title="Add Activity"
      >
        {addingGapActivity && (
          <ActivityForm
            context="statistics"
            initialGap={{
              startTime: addingGapActivity.startTime,
              endTime: addingGapActivity.endTime,
              durationMinutes: addingGapActivity.durationMinutes
            }}
            onSave={handleAddSave}
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

      <SuccessAnimation show={showSuccess} message="Activity updated successfully!" />

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
