import type { Activity } from '@/types';
import { formatDuration, formatDurationLong } from './timeUtils';

// ── Insight generators ────────────────────────────────────────

export function generateInsights(activities: Activity[], date: string): string[] {
  if (activities.length === 0) return [];

  const insights: string[] = [];

  const positiveMin = activities
    .filter(a => a.category === 'Positive')
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const negativeMin = activities
    .filter(a => a.category === 'Negative')
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const neutralMin = activities
    .filter(a => a.category === 'Neutral')
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const totalMin = positiveMin + negativeMin + neutralMin;

  if (totalMin === 0) return [];

  // ── Positive % insight ──
  const positivePct = Math.round((positiveMin / totalMin) * 100);
  const negativePct = Math.round((negativeMin / totalMin) * 100);
  const neutralPct = Math.round((neutralMin / totalMin) * 100);

  if (positivePct > 0) {
    insights.push(`You spent ${positivePct}% of your logged time on positive activities.`);
  }

  // ── Negative warning ──
  if (negativeMin >= 60) {
    insights.push(`⚠️ You spent ${formatDurationLong(negativeMin)} on negative activities today.`);
  } else if (negativeMin > 0) {
    insights.push(`You had ${formatDurationLong(negativeMin)} of negative activity today.`);
  }

  // ── Dominant period insight ──
  const morningActivities = activities.filter(a => {
    const h = parseInt(a.startTime.split(':')[0], 10);
    return h >= 6 && h < 12;
  });
  const afternoonActivities = activities.filter(a => {
    const h = parseInt(a.startTime.split(':')[0], 10);
    return h >= 12 && h < 18;
  });
  const eveningActivities = activities.filter(a => {
    const h = parseInt(a.startTime.split(':')[0], 10);
    return h >= 18 || h < 6;
  });

  const getDominantCategory = (acts: Activity[]): string | null => {
    if (acts.length === 0) return null;
    const mins = { Positive: 0, Neutral: 0, Negative: 0 };
    acts.forEach(a => { mins[a.category] += a.durationMinutes; });
    const max = Math.max(mins.Positive, mins.Neutral, mins.Negative);
    if (max === 0) return null;
    if (mins.Positive === max) return 'positive';
    if (mins.Neutral === max) return 'neutral';
    return 'negative';
  };

  const morningDom = getDominantCategory(morningActivities);
  const afternoonDom = getDominantCategory(afternoonActivities);
  const eveningDom = getDominantCategory(eveningActivities);

  if (morningDom && morningActivities.length > 0)
    insights.push(`Your morning was mostly ${morningDom} activities.`);
  if (afternoonDom && afternoonActivities.length > 0)
    insights.push(`Most of your afternoon was ${afternoonDom}.`);
  if (eveningDom && eveningActivities.length > 0)
    insights.push(`You spent your evening on ${eveningDom} activities.`);

  // ── Longest productive session ──
  const posActivities = activities.filter(a => a.category === 'Positive');
  if (posActivities.length > 0) {
    const longest = Math.max(...posActivities.map(a => a.durationMinutes));
    if (longest >= 30) {
      insights.push(`🏆 Your longest productive session was ${formatDuration(longest)}.`);
    }
  }

  // ── Total logged ──
  insights.push(`You logged a total of ${formatDurationLong(totalMin)} across ${activities.length} activit${activities.length === 1 ? 'y' : 'ies'}.`);

  // ── Neutral heavy ──
  if (neutralPct >= 50) {
    insights.push(`💡 Over half your day was neutral. Consider converting some of that time to positive activities.`);
  }

  // ── Great day ──
  if (positivePct >= 70 && negativeMin === 0) {
    insights.push(`🌟 Excellent day! Almost no negative activities logged.`);
  }

  return insights.slice(0, 6);
}

// ── Productivity Score ────────────────────────────────────────

/**
 * Score formula: positive% - (negative% * 1.5), clamped to 0-100
 */
export function calcProductivityScore(
  positiveMinutes: number,
  negativeMinutes: number,
  neutralMinutes: number
): number {
  const total = positiveMinutes + negativeMinutes + neutralMinutes;
  if (total === 0) return 0;
  const posRatio = positiveMinutes / total;
  const negRatio = negativeMinutes / total;
  const score = Math.round((posRatio - negRatio * 1.5) * 100);
  return Math.max(0, Math.min(100, score));
}

// ── Score label ───────────────────────────────────────────────

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  if (score >= 20) return 'Below Average';
  return 'Needs Work';
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}
