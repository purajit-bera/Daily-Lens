import { useState, useCallback, useEffect } from 'react';
import type { TimeSyncState } from '@/types';
import { currentTime, currentTimeMinus, calcDuration, calcEndTime, calcStartTime, todayDate } from '@/utils/timeUtils';

const DEFAULT_DURATION = 60;

function getDefaultState(): TimeSyncState {
  const end = currentTime();
  return {
    startTime: calcStartTime(end, DEFAULT_DURATION),
    endTime: end,
    durationMinutes: DEFAULT_DURATION,
  };
}

/**
 * Manages synchronized time fields: startTime, endTime, durationMinutes.
 *
 * Sync rules:
 * - Change duration → start = end - duration (end stays fixed)
 * - Change endTime  → duration = end - start (start stays fixed)
 * - Change startTime → duration = end - start (end stays fixed)
 */
export function useTimeSync(date: string, initial?: Partial<TimeSyncState>) {
  const [state, setState] = useState<TimeSyncState & { isManualEndTime: boolean }>(() => ({
    ...getDefaultState(),
    isManualEndTime: !!(initial && initial.endTime),
    ...initial,
  }));

  useEffect(() => {
    if (state.isManualEndTime || date !== todayDate()) return;
    
    const timer = setInterval(() => {
      const now = currentTime();
      if (state.endTime !== now) {
        setState(prev => {
          if (prev.isManualEndTime) return prev;
          const newStart = calcStartTime(now, prev.durationMinutes);
          return { ...prev, startTime: newStart, endTime: now };
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.isManualEndTime, state.endTime, date]);

  const setStartTime = useCallback((startTime: string) => {
    setState(prev => {
      const duration = calcDuration(startTime, prev.endTime);
      return { startTime, endTime: prev.endTime, durationMinutes: duration, isManualEndTime: true };
    });
  }, []);

  const setEndTime = useCallback((endTime: string) => {
    setState(prev => {
      const duration = calcDuration(prev.startTime, endTime);
      return { startTime: prev.startTime, endTime, durationMinutes: duration, isManualEndTime: true };
    });
  }, []);

  const setDuration = useCallback((durationMinutes: number) => {
    setState(prev => {
      const safeMin = Math.max(1, Math.min(1440, durationMinutes));
      const startTime = calcStartTime(prev.endTime, safeMin);
      return { startTime, endTime: prev.endTime, durationMinutes: safeMin, isManualEndTime: true };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ ...getDefaultState(), isManualEndTime: false });
  }, []);

  const setAll = useCallback((s: Partial<TimeSyncState>) => {
    setState(prev => ({ ...prev, ...s, isManualEndTime: true }));
  }, []);

  return {
    startTime: state.startTime,
    endTime: state.endTime,
    durationMinutes: state.durationMinutes,
    setStartTime,
    setEndTime,
    setDuration,
    reset,
    setAll,
  };
}
