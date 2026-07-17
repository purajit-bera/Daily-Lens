import { useState, useCallback, useEffect } from 'react';
import type { TimeSyncState } from '@/types';
import { currentTime, currentTimeMinus, calcDuration, calcEndTime, calcStartTime, todayDate, normalizeTimeFormat } from '@/utils/timeUtils';

function getDefaultState(defaultDuration: number): TimeSyncState {
  const end = currentTime();
  return {
    startTime: calcStartTime(end, defaultDuration),
    endTime: end,
    durationMinutes: defaultDuration,
  };
}

export type TimeAnchor = 'start' | 'end';

/**
 * Manages synchronized time fields: startTime, endTime, durationMinutes.
 *
 * Sync rules:
 * - Change duration (Anchor = end) → start = end - duration (end stays fixed)
 * - Change duration (Anchor = start) → end = start + duration (start stays fixed)
 * - Change endTime  → duration = end - start (start stays fixed)
 * - Change startTime → duration = end - start (end stays fixed)
 */
export function useTimeSync(date: string, initial?: Partial<TimeSyncState>, wakeUpTime: string = '00:00', defaultDuration: number = 60) {
  const normalizedInitial = initial ? {
    ...initial,
    startTime: initial.startTime ? normalizeTimeFormat(initial.startTime) : undefined,
    endTime: initial.endTime ? normalizeTimeFormat(initial.endTime) : undefined,
  } : undefined;

  const [state, setState] = useState<TimeSyncState & { isManualEndTime: boolean, timeAnchor: TimeAnchor }>(() => ({
    ...getDefaultState(defaultDuration),
    isManualEndTime: !!(normalizedInitial && normalizedInitial.endTime),
    timeAnchor: 'end',
    ...normalizedInitial,
  }));

  useEffect(() => {
    if (state.isManualEndTime || date !== todayDate(wakeUpTime)) return;
    
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
  }, [state.isManualEndTime, state.endTime, date, wakeUpTime]);

  useEffect(() => {
    setState(prev => {
      if (!prev.isManualEndTime && prev.durationMinutes !== defaultDuration) {
        return {
          ...prev,
          durationMinutes: defaultDuration,
          startTime: calcStartTime(prev.endTime, defaultDuration),
        };
      }
      return prev;
    });
  }, [defaultDuration]);

  const setStartTime = useCallback((startTime: string) => {
    setState(prev => {
      const duration = calcDuration(startTime, prev.endTime, wakeUpTime);
      return { ...prev, startTime, durationMinutes: duration, isManualEndTime: true };
    });
  }, [wakeUpTime]);

  const setEndTime = useCallback((endTime: string) => {
    setState(prev => {
      const duration = calcDuration(prev.startTime, endTime, wakeUpTime);
      return { ...prev, endTime, durationMinutes: duration, isManualEndTime: true };
    });
  }, [wakeUpTime]);

  const setDuration = useCallback((durationMinutes: number) => {
    setState(prev => {
      const safeMin = Math.max(1, Math.min(1440, durationMinutes));
      
      if (prev.timeAnchor === 'end') {
        const startTime = calcStartTime(prev.endTime, safeMin);
        return { ...prev, startTime, durationMinutes: safeMin, isManualEndTime: true };
      } else {
        let endTime = calcEndTime(prev.startTime, safeMin);
        let finalDuration = safeMin;
        
        // Future time restriction for today
        if (date === todayDate(wakeUpTime)) {
          const now = currentTime();
          if (endTime > now) {
            endTime = now;
            finalDuration = calcDuration(prev.startTime, endTime, wakeUpTime);
          }
        }
        
        return { ...prev, endTime, durationMinutes: finalDuration, isManualEndTime: true };
      }
    });
  }, [date, wakeUpTime]);

  const setTimeAnchor = useCallback((timeAnchor: TimeAnchor) => {
    setState(prev => ({ ...prev, timeAnchor }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...getDefaultState(defaultDuration), isManualEndTime: false, timeAnchor: 'end' });
  }, [defaultDuration]);

  const setAll = useCallback((s: Partial<TimeSyncState>) => {
    setState(prev => ({ ...prev, ...s, isManualEndTime: true }));
  }, []);

  return {
    startTime: state.startTime,
    endTime: state.endTime,
    durationMinutes: state.durationMinutes,
    timeAnchor: state.timeAnchor,
    setTimeAnchor,
    setStartTime,
    setEndTime,
    setDuration,
    reset,
    setAll,
  };
}
