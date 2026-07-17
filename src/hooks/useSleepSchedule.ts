import { useSettings } from '@/context/SettingsContext';
import { useOverrides } from '@/context/OverridesContext';
import { dayjs } from '@/utils/timeUtils';

export function useSleepSchedule(date: string) {
  const { settings } = useSettings();
  const { overrides } = useOverrides();

  const override = overrides[date];
  const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
  const prevOverride = overrides[prevDate];

  return {
    wakeUpTime: override?.wakeUpTime ?? settings.wakeUpTime,
    bedtime: override?.bedtime ?? settings.bedtime,
    previousBedtime: prevOverride?.bedtime ?? settings.bedtime,
    isOverridden: !!override,
  };
}
