import { useMemo } from 'react';
import type { Activity } from '@/types';
import { generateInsights, calcProductivityScore } from '@/utils/insights';

export function useInsights(activities: Activity[], date: string) {
  const insights = useMemo(
    () => generateInsights(activities, date),
    [activities, date]
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

    const productivityScore = calcProductivityScore(
      positiveMinutes,
      negativeMinutes,
      neutralMinutes
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
      productivityScore,
    };
  }, [activities]);

  return { insights, stats };
}
