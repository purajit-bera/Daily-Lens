import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// ── Formatting ────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD in local timezone */
export function todayDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** Current time as HH:mm (24h) */
export function currentTime(): string {
  return dayjs().format('HH:mm');
}

/** Current time minus N minutes as HH:mm */
export function currentTimeMinus(minutes: number): string {
  return dayjs().subtract(minutes, 'minute').format('HH:mm');
}

/** Format HH:mm to 12h display (e.g. "3:30 PM") */
export function formatTime12h(time: string): string {
  return dayjs(`2000-01-01 ${time}`, 'YYYY-MM-DD HH:mm').format('h:mm A');
}

/** Format YYYY-MM-DD to display (e.g. "July 16, 2026") */
export function formatDate(date: string): string {
  return dayjs(date, 'YYYY-MM-DD').format('MMMM D, YYYY');
}

/** Format YYYY-MM-DD to short display (e.g. "Jul 16") */
export function formatDateShort(date: string): string {
  return dayjs(date, 'YYYY-MM-DD').format('MMM D');
}

/** Format minutes to "Xh Ym" or "Y min" */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format minutes to "X hours Y minutes" (long form for insights) */
export function formatDurationLong(minutes: number): string {
  if (minutes <= 0) return '0 minutes';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
}

// ── Time Sync Calculations ────────────────────────────────────

/**
 * Calculate duration in minutes between two HH:mm times.
 * startTime is the earlier time, endTime is the later time.
 * Handles crossing midnight correctly.
 */
export function calcDuration(startTime: string, endTime: string): number {
  const start = dayjs(`2000-01-01 ${startTime}`, 'YYYY-MM-DD HH:mm');
  let end = dayjs(`2000-01-01 ${endTime}`, 'YYYY-MM-DD HH:mm');
  // if end is before start, it implies it crossed midnight into the next day
  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }
  return Math.abs(end.diff(start, 'minute'));
}

/**
 * Calculate endTime given startTime and duration.
 * endTime = startTime + duration (activity goes forward in time)
 */
export function calcEndTime(startTime: string, durationMinutes: number): string {
  return dayjs(`2000-01-01 ${startTime}`, 'YYYY-MM-DD HH:mm')
    .add(durationMinutes, 'minute')
    .format('HH:mm');
}

/**
 * Calculate startTime given endTime and duration.
 * startTime = endTime - duration (start is before end)
 */
export function calcStartTime(endTime: string, durationMinutes: number): string {
  return dayjs(`2000-01-01 ${endTime}`, 'YYYY-MM-DD HH:mm')
    .subtract(durationMinutes, 'minute')
    .format('HH:mm');
}

// ── Sorting ───────────────────────────────────────────────────

/** Compare two HH:mm strings for sorting (ascending) */
export function compareTime(a: string, b: string): number {
  const ta = dayjs(`2000-01-01 ${a}`, 'YYYY-MM-DD HH:mm');
  const tb = dayjs(`2000-01-01 ${b}`, 'YYYY-MM-DD HH:mm');
  return ta.isBefore(tb) ? -1 : ta.isAfter(tb) ? 1 : 0;
}

// ── Date ranges ───────────────────────────────────────────────

/** Get last N days as YYYY-MM-DD strings (most recent first) */
export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
  }
  return days;
}

/** Get the week day label (Mon, Tue, ...) for a YYYY-MM-DD date */
export function getDayLabel(date: string): string {
  return dayjs(date, 'YYYY-MM-DD').format('ddd');
}

// ── Unique ID ─────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { dayjs };
