import { DEFAULT_SETTINGS, type Settings } from '@/config/settings';

const SETTINGS_SHEET_NAME = 'Settings';
const RANGE = `${SETTINGS_SHEET_NAME}!A:B`; // Key-Value pairs

function makeHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Ensures the Settings sheet exists. Creates it if it doesn't.
 */
export async function ensureSettingsSheet(token: string, spreadsheetId: string): Promise<void> {
  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const info = (await handleResponse(
    await fetch(infoUrl, { headers: makeHeaders(token) })
  )) as any;

  const sheetExists = info.sheets.some((s: any) => s.properties.title === SETTINGS_SHEET_NAME);
  if (sheetExists) return;

  const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await handleResponse(
    await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: SETTINGS_SHEET_NAME,
              },
            },
          },
        ],
      }),
    })
  );
}

/**
 * Fetch settings from Google Sheets and merge with defaults.
 */
export async function fetchSettings(token: string, spreadsheetId: string): Promise<Settings> {
  await ensureSettingsSheet(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`;
  const data = (await handleResponse(
    await fetch(url, { headers: makeHeaders(token) })
  )) as { values?: string[][] };

  const values = data.values || [];
  const settingsObj = { ...DEFAULT_SETTINGS } as any;

  for (const row of values) {
    if (row.length === 2) {
      const [key, value] = row;
      if (key in DEFAULT_SETTINGS) {
        // Parse numbers if applicable
        const numValue = Number(value);
        if (!isNaN(numValue) && typeof DEFAULT_SETTINGS[key as keyof Settings] === 'number') {
          settingsObj[key] = numValue;
        } else {
          settingsObj[key] = value;
        }
      }
    }
  }

  return settingsObj as Settings;
}

/**
 * Sync entire settings object to the Google Sheet.
 * This overwrites the existing settings data.
 */
export async function syncSettings(token: string, spreadsheetId: string, settings: Settings): Promise<void> {
  await ensureSettingsSheet(token, spreadsheetId);

  const values = Object.entries(settings).map(([key, value]) => [key, String(value)]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}?valueInputOption=USER_ENTERED`;
  await handleResponse(
    await fetch(url, {
      method: 'PUT',
      headers: makeHeaders(token),
      body: JSON.stringify({ values }),
    })
  );
}
