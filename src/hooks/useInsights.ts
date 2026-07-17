import { useMemo } from 'react';
import type { Activity } from '@/types';
import { generateSmartInsights, calculateDailyScore, type ScoreBreakdown } from '@/utils/insights';
import { useSettings } from '@/context/SettingsContext';

export function useInsights(activities: Activity[], recentActivities: Activity[], date: string) {
  const { settings } = useSettings();
  const insights = useMemo(
    () => generateSmartInsights(activities, recentActivities, date),
    [activities, recentActivities, date]
  );

  const stats = useMemo(() => {
    const positiveMinutes = activities
      .filter(a => a.category === 'Positive')
      .reduce((s, a) => s + a.durationMinutes, 0);
    const negativeMinutes = activities
      .filter(a => a.category === 'Negative')
      .reduce((s, a) => s + a.durationMinutes, 0);
    const neutralMinutes = activities
      .filter(a => a.category === 'Neutral')
      .reduce((s, a) => s + a.durationMinutes, 0);
    const totalMinutes = positiveMinutes + negativeMinutes + neutralMinutes;

    const safePercent = (n: number) =>
      totalMinutes > 0 ? Math.round((n / totalMinutes) * 100) : 0;

    const scoreBreakdown = calculateDailyScore(
      positiveMinutes,
      negativeMinutes,
      neutralMinutes,
      settings.positiveGoalMinutes ?? 480,
      settings.neutralThresholdMinutes ?? 600
    );

    return {
      totalActivities: activities.length,
      totalMinutes,
      positiveMinutes,
      negativeMinutes,
      neutralMinutes,
      positivePercent: safePercent(positiveMinutes),
      negativePercent: safePercent(negativeMinutes),
      neutralPercent: safePercent(neutralMinutes),
      scoreBreakdown,
    };
  }, [activities, settings.positiveGoalMinutes, settings.neutralThresholdMinutes]);

  return { insights, stats };
}
