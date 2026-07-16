import fetch from 'node-fetch';

const SETTINGS_SHEET_NAME = 'Settings';
const RANGE = `${SETTINGS_SHEET_NAME}!A:B`;

// We don't have access to the frontend's DEFAULT_SETTINGS, so we'll just fetch/save RAW arrays
// and let the frontend do the merging logic to keep the backend lean, or we can copy it.
// To keep things simple and strictly backend-agnostic, the backend will just send/receive key-values.

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(res: any) {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Settings API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function ensureSettingsSheet(token: string, spreadsheetId: string) {
  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const info = await handleResponse(await fetch(infoUrl, { headers: makeHeaders(token) })) as any;

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

export async function fetchSettingsRaw(token: string, spreadsheetId: string) {
  await ensureSettingsSheet(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`;
  const data = await handleResponse(await fetch(url, { headers: makeHeaders(token) })) as any;
  
  return data.values || [];
}

export async function syncSettingsRaw(token: string, spreadsheetId: string, values: string[][]) {
  await ensureSettingsSheet(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}?valueInputOption=USER_ENTERED`;
  await handleResponse(
    await fetch(url, {
      method: 'PUT',
      headers: makeHeaders(token),
      body: JSON.stringify({ values }),
    })
  );
}
