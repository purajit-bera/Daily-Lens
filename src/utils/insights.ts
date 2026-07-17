import type { Activity } from '@/types';
import { formatDuration, formatDurationLong } from './timeUtils';

// ── Insight generators ────────────────────────────────────────

// ── Smart Insights Generator ──────────────────────────────────

interface ScoredInsight {
  text: string;
  score: number; // Higher is more interesting
}

export function generateSmartInsights(
  todayActivities: Activity[],
  recentActivities: Activity[], // including today
  date: string
): string[] {
  if (todayActivities.length === 0) return [];

  const insights: ScoredInsight[] = [];

  // Group activities
  const positive = todayActivities.filter(a => a.category === 'Positive');
  const negative = todayActivities.filter(a => a.category === 'Negative');
  const neutral = todayActivities.filter(a => a.category === 'Neutral');

  const posMin = positive.reduce((s, a) => s + a.durationMinutes, 0);
  const negMin = negative.reduce((s, a) => s + a.durationMinutes, 0);
  const neuMin = neutral.reduce((s, a) => s + a.durationMinutes, 0);

  // 1. Productivity Patterns
  if (positive.length > 0) {
    const longest = Math.max(...positive.map(a => a.durationMinutes));
    if (longest >= 60) {
      insights.push({ text: `Your longest uninterrupted focus session lasted ${formatDuration(longest)}.`, score: 90 });
    } else if (longest >= 30) {
      insights.push({ text: `Your longest positive session lasted ${formatDuration(longest)}.`, score: 60 });
    }

    const avgPos = Math.round(posMin / positive.length);
    insights.push({ text: `Your average positive session lasted ${avgPos} minutes.`, score: 50 });
  }

  // Time of day analysis
  const getPeriod = (timeStr: string) => {
    const h = parseInt(timeStr.split(':')[0], 10);
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    return 'evening';
  };

  const periodMins: Record<string, { pos: number, neg: number }> = {
    morning: { pos: 0, neg: 0 },
    afternoon: { pos: 0, neg: 0 },
    evening: { pos: 0, neg: 0 }
  };

  todayActivities.forEach(a => {
    const p = getPeriod(a.startTime);
    if (a.category === 'Positive') periodMins[p].pos += a.durationMinutes;
    if (a.category === 'Negative') periodMins[p].neg += a.durationMinutes;
  });

  const bestPeriod = Object.entries(periodMins).reduce((a, b) => a[1].pos > b[1].pos ? a : b);
  if (bestPeriod[1].pos > 0) {
    insights.push({ text: `Your ${bestPeriod[0]} was your most productive period today.`, score: 75 });
  }

  const worstPeriod = Object.entries(periodMins).reduce((a, b) => a[1].neg > b[1].neg ? a : b);
  if (worstPeriod[1].neg > 0) {
    insights.push({ text: `Most of your Negative activities occurred during the ${worstPeriod[0]}.`, score: 80 });
  }

  // 2. Activity Analysis (Descriptions)
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
  };

  const getTopActivity = (acts: Activity[]) => {
    if (acts.length === 0) return null;
    const map = new Map<string, { name: string, min: number }>();
    acts.forEach(a => {
      const name = stripHtml(a.description);
      if (name) {
        const key = name.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.min += a.durationMinutes;
        } else {
          map.set(key, { name, min: a.durationMinutes });
        }
      }
    });
    if (map.size === 0) return null;
    return Array.from(map.values()).sort((a, b) => b.min - a.min)[0];
  };

  const topPos = getTopActivity(positive);
  if (topPos && topPos.min > 0) {
    const pct = Math.round((topPos.min / posMin) * 100);
    insights.push({ text: `"${topPos.name}" accounted for ${pct}% of your Positive time.`, score: 85 });
  }

  const topNeg = getTopActivity(negative);
  if (topNeg && topNeg.min > 0) {
    insights.push({ text: `"${topNeg.name}" was your largest Negative activity today (${formatDuration(topNeg.min)}).`, score: 85 });
  }

  const topNeu = getTopActivity(neutral);
  if (topNeu && topNeu.min > 0) {
    insights.push({ text: `"${topNeu.name}" consumed most of your Neutral time (${formatDuration(topNeu.min)}).`, score: 65 });
  }

  // 3. Timeline Observations
  if (todayActivities.length >= 8) {
    const avgTotal = Math.round((posMin + negMin + neuMin) / todayActivities.length);
    if (avgTotal < 30) {
      insights.push({ text: `You switched activities ${todayActivities.length} times today. High context switching can reduce deep focus.`, score: 95 });
    }
  }

  // 4. Historical Trends
  const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
  const yesterdayActs = recentActivities.filter(a => a.date === yesterday);
  
  if (yesterdayActs.length > 0) {
    const yPosMin = yesterdayActs.filter(a => a.category === 'Positive').reduce((s, a) => s + a.durationMinutes, 0);
    const yNegMin = yesterdayActs.filter(a => a.category === 'Negative').reduce((s, a) => s + a.durationMinutes, 0);

    const posDiff = posMin - yPosMin;
    if (posDiff >= 30) {
      insights.push({ text: `You spent ${formatDuration(posDiff)} more on Positive activities than yesterday!`, score: 100 });
    } else if (posDiff <= -60) {
      insights.push({ text: `Your Positive time dropped by ${formatDuration(Math.abs(posDiff))} compared to yesterday.`, score: 70 });
    }

    const negDiff = negMin - yNegMin;
    if (negDiff <= -30) {
      insights.push({ text: `Great job! Your Negative time decreased by ${formatDuration(Math.abs(negDiff))} compared to yesterday.`, score: 100 });
    }
  }

  // Sort by score (descending) and return top 5
  return insights
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(i => i.text);
}

// ── Daily Score Breakdown (New System) ────────────────────────

export interface ScoreBreakdown {
  finalScore: number;
  maxPossibleScore: number;
  completionPct: number;
  negativePenalty: number;
  neutralPenalty: number;
  positiveMinutes: number;
  neutralMinutes: number;
  negativeMinutes: number;
  positiveGoalMinutes: number;
  neutralThresholdMinutes: number;
  feedbackTitle: string;
  feedbackMessage: string;
  feedbackSuggestions: string[];
}

const NEGATIVE_PENALTY_CURVE = [
  { min: 0, penalty: 0 },
  { min: 15, penalty: 2 },
  { min: 30, penalty: 5 },
  { min: 60, penalty: 12 },
  { min: 120, penalty: 25 },
  { min: 180, penalty: 40 },
  { min: 240, penalty: 60 }
];

function calculateNegativePenalty(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes >= 240) return 60;
  
  for (let i = 0; i < NEGATIVE_PENALTY_CURVE.length - 1; i++) {
    const current = NEGATIVE_PENALTY_CURVE[i];
    const next = NEGATIVE_PENALTY_CURVE[i+1];
    
    if (minutes >= current.min && minutes <= next.min) {
      const range = next.min - current.min;
      const progress = minutes - current.min;
      const percentage = progress / range;
      const penaltyRange = next.penalty - current.penalty;
      return Math.round(current.penalty + (percentage * penaltyRange));
    }
  }
  return 0;
}

export function calculateDailyScore(
  positiveMinutes: number,
  negativeMinutes: number,
  neutralMinutes: number,
  positiveGoalMinutes: number,
  neutralThresholdMinutes: number
): ScoreBreakdown {
  // Stage 1: Deductions
  const negativePenalty = calculateNegativePenalty(negativeMinutes);
  
  const excessNeutral = Math.max(0, neutralMinutes - neutralThresholdMinutes);
  const neutralPenalty = Math.floor(excessNeutral / 15); // -1 point per 15 mins over threshold
  
  const maxPossibleScore = Math.max(0, 100 - negativePenalty - neutralPenalty);
  
  // Stage 2: Completion
  let completionPct = 0;
  if (positiveGoalMinutes > 0) {
    completionPct = Math.min(100, Math.round((positiveMinutes / positiveGoalMinutes) * 100));
  }
  
  const finalScore = Math.round(maxPossibleScore * (completionPct / 100));

  const breakdown: ScoreBreakdown = {
    finalScore,
    maxPossibleScore,
    completionPct,
    negativePenalty,
    neutralPenalty,
    positiveMinutes,
    neutralMinutes,
    negativeMinutes,
    positiveGoalMinutes,
    neutralThresholdMinutes,
    feedbackTitle: '',
    feedbackMessage: '',
    feedbackSuggestions: []
  };

  return generateScoreFeedback(breakdown);
}

function generateScoreFeedback(b: ScoreBreakdown): ScoreBreakdown {
  let title = '';
  let message = '';
  const suggestions: string[] = [];

  const positiveShortfall = Math.max(0, b.positiveGoalMinutes - b.positiveMinutes);
  const excessNeutral = Math.max(0, b.neutralMinutes - b.neutralThresholdMinutes);

  if (b.finalScore >= 90) {
    title = 'Excellent Day';
    message = 'Great work! You completed your Positive Activity goal and kept your habits balanced.';
  } else if (b.negativeMinutes >= 60) {
    title = 'Too Much Negative Time';
    message = `You spent ${formatDurationLong(b.negativeMinutes)} on Negative activities today. This heavily reduced your maximum possible score.`;
  } else if (b.completionPct < 50) {
    title = 'Not Enough Positive Activities';
    message = `You completed only ${formatDurationLong(b.positiveMinutes)} of your ${formatDurationLong(b.positiveGoalMinutes)} Positive Activity goal.`;
  } else if (excessNeutral >= 60) {
    title = 'Too Much Neutral Time';
    message = 'Most of your day was spent on Neutral activities. While important, they exceeded your healthy threshold and reduced your maximum possible score.';
  } else if (b.finalScore >= 70) {
    title = 'Good Day';
    message = 'You made solid progress today! Just a few small adjustments could make tomorrow even better.';
  } else {
    title = 'Room for Improvement';
    message = 'Your day lacked balance. Review your activities to see where you can adjust tomorrow.';
  }

  if (b.negativeMinutes > 0) {
    suggestions.push(`Reduce Negative activities by at least ${formatDurationLong(Math.min(30, b.negativeMinutes))}.`);
  }
  
  if (positiveShortfall > 0) {
    suggestions.push(`Complete another ${formatDurationLong(positiveShortfall)} of Positive activities to hit your goal.`);
  }

  if (excessNeutral > 0) {
    suggestions.push(`Reduce unnecessary Neutral time by ${formatDurationLong(Math.min(45, excessNeutral))} to keep it below your threshold.`);
  }

  b.feedbackTitle = title;
  b.feedbackMessage = message;
  b.feedbackSuggestions = suggestions.slice(0, 3); // top 3 prioritize

  return b;
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
