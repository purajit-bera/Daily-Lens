import type { Activity, SheetRow } from '@/types';
import { generateId } from '@/utils/timeUtils';

const SHEET_NAME = 'Activities';
const RANGE = `${SHEET_NAME}!A:H`; // Expanded to H to include ID

// ── Helpers ───────────────────────────────────────────────────

function makeHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ── Convert between Activity and SheetRow ─────────────────────

function activityToRow(activity: Activity): string[] {
  return [
    activity.date,
    activity.startTime,
    activity.endTime,
    String(activity.durationMinutes),
    activity.category,
    activity.description,
    activity.createdAt,
    activity.id,
  ];
}

function rowToActivity(row: string[]): Activity | null {
  if (!row || row.length < 6) return null;
  const [date, startTime, endTime, duration, category, description, createdAt, id] = row;

  if (!date || !startTime || !endTime) return null;

  const validCategories = ['Positive', 'Neutral', 'Negative'];
  if (!validCategories.includes(category)) return null;

  return {
    id: id || generateId(), // Fallback for old records without an ID
    date,
    startTime,
    endTime,
    durationMinutes: parseInt(duration, 10) || 0,
    category: category as Activity['category'],
    description: description || '',
    createdAt: createdAt || new Date().toISOString(),
  };
}

// ── API Functions ─────────────────────────────────────────────

async function fetchRawValues(token: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`;
  const data = (await handleResponse(
    await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  )) as { values?: string[][] };
  return data.values || [];
}

/**
 * Append a single activity as a row to the Google Sheet.
 */
export async function appendActivity(
  token: string,
  spreadsheetId: string,
  activity: Activity
): Promise<void> {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  await handleResponse(
    await fetch(url, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify({ values: [activityToRow(activity)] }),
    })
  );
}

/**
 * Update an existing activity in the Google Sheet.
 */
export async function updateActivityInSheet(
  token: string,
  spreadsheetId: string,
  activity: Activity
): Promise<void> {
  const values = await fetchRawValues(token, spreadsheetId);
  // Find row index (1-based for A1 notation). Header is row 1 (index 0).
  const index = values.findIndex(row => row[7] === activity.id || row[6] === activity.createdAt);
  
  if (index === -1) {
    throw new Error('Activity not found in sheet.');
  }

  const rowNumber = index + 1;
  const updateRange = `${SHEET_NAME}!A${rowNumber}:H${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;

  await handleResponse(
    await fetch(url, {
      method: 'PUT',
      headers: makeHeaders(token),
      body: JSON.stringify({ values: [activityToRow(activity)] }),
    })
  );
}

/**
 * Delete an activity from the Google Sheet.
 */
export async function deleteActivityFromSheet(
  token: string,
  spreadsheetId: string,
  activityId: string,
  createdAt: string
): Promise<void> {
  const values = await fetchRawValues(token, spreadsheetId);
  const index = values.findIndex(row => row[7] === activityId || row[6] === createdAt);
  
  if (index === -1) {
    throw new Error('Activity not found in sheet.');
  }

  // To delete a row, we need the sheetId (not spreadsheetId)
  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const info = (await handleResponse(
    await fetch(infoUrl, { headers: makeHeaders(token) })
  )) as any;
  
  const sheet = info.sheets.find((s: any) => s.properties.title === SHEET_NAME);
  if (!sheet) throw new Error('Activities sheet not found.');

  const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await handleResponse(
    await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: index,
                endIndex: index + 1
              }
            }
          }
        ]
      }),
    })
  );
}

/**
 * Fetch all rows from the sheet and parse them into Activity objects.
 */
export async function fetchAllActivities(
  token: string,
  spreadsheetId: string
): Promise<Activity[]> {
  const values = await fetchRawValues(token, spreadsheetId);
  if (values.length <= 1) return [];

  // Skip header row (index 0)
  const rows = values.slice(1) as SheetRow[];
  return rows.map(r => rowToActivity(r as string[])).filter((a): a is Activity => a !== null);
}

/**
 * Fetch activities for a specific date (YYYY-MM-DD).
 * Reads all rows and filters client-side (simpler, avoids complex query API).
 */
export async function fetchActivitiesByDate(
  token: string,
  spreadsheetId: string,
  date: string
): Promise<Activity[]> {
  const all = await fetchAllActivities(token, spreadsheetId);
  return all.filter(a => a.date === date);
}

/**
 * Fetch activities for the last N days (for heatmap / trend charts).
 */
export async function fetchRecentActivities(
  token: string,
  spreadsheetId: string,
  days: number
): Promise<Activity[]> {
  const all = await fetchAllActivities(token, spreadsheetId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter(a => a.date >= cutoffStr);
}
