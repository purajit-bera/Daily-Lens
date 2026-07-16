import type { Activity } from '@/types';

// ── Helpers ───────────────────────────────────────────────────

async function handleResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string })?.error ?? `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ── API Functions ─────────────────────────────────────────────

/**
 * Append a single activity as a row to the Google Sheet.
 */
export async function appendActivity(activity: Activity): Promise<void> {
  await handleResponse(
    await fetch('/api/sheets/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity }),
    })
  );
}

/**
 * Update an existing activity in the Google Sheet.
 */
export async function updateActivityInSheet(activity: Activity): Promise<void> {
  await handleResponse(
    await fetch('/api/sheets/activities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity }),
    })
  );
}

/**
 * Delete an activity from the Google Sheet.
 */
export async function deleteActivityFromSheet(activityId: string, createdAt: string): Promise<void> {
  const params = new URLSearchParams({ activityId, createdAt });
  await handleResponse(
    await fetch(`/api/sheets/activities?${params.toString()}`, {
      method: 'DELETE',
    })
  );
}

/**
 * Fetch all rows from the sheet and parse them into Activity objects.
 */
export async function fetchAllActivities(): Promise<Activity[]> {
  const data = (await handleResponse(
    await fetch('/api/sheets/activities')
  )) as Activity[];
  return data || [];
}

/**
 * Fetch activities for a specific date (YYYY-MM-DD).
 */
export async function fetchActivitiesByDate(date: string): Promise<Activity[]> {
  const all = await fetchAllActivities();
  return all.filter(a => a.date === date);
}

/**
 * Fetch activities for the last N days (for heatmap / trend charts).
 */
export async function fetchRecentActivities(days: number): Promise<Activity[]> {
  const all = await fetchAllActivities();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter(a => a.date >= cutoffStr);
}
