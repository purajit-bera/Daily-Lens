export const DEFAULT_SETTINGS = {
  minUntrackedGapMinutes: 10,
  defaultDurationMinutes: 60,
  defaultCategory: 'Positive',
  wakeUpTime: '06:00',
  bedtime: '23:00',
  theme: 'system',
  showQuickTips: true,
  positiveGoalMinutes: 480, // 8 hours
  neutralThresholdMinutes: 600, // 10 hours
};

export type Settings = typeof DEFAULT_SETTINGS;
