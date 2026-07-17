const OVERRIDES_SHEET_NAME = 'DailyOverrides';
const RANGE = `${OVERRIDES_SHEET_NAME}!A:C`;

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(res: any) {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Overrides API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function ensureOverridesSheet(token: string, spreadsheetId: string) {
  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const info = await handleResponse(await fetch(infoUrl, { headers: makeHeaders(token) })) as any;

  const sheetExists = info.sheets.some((s: any) => s.properties.title === OVERRIDES_SHEET_NAME);
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
                title: OVERRIDES_SHEET_NAME,
              },
            },
          },
        ],
      }),
    })
  );
}

export async function fetchOverridesRaw(token: string, spreadsheetId: string) {
  await ensureOverridesSheet(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`;
  const data = await handleResponse(await fetch(url, { headers: makeHeaders(token) })) as any;
  
  return data.values || [];
}

export async function syncOverridesRaw(token: string, spreadsheetId: string, values: string[][]) {
  await ensureOverridesSheet(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}?valueInputOption=USER_ENTERED`;
  await handleResponse(
    await fetch(url, {
      method: 'PUT',
      headers: makeHeaders(token),
      body: JSON.stringify({ values }),
    })
  );
}
