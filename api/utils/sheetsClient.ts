

const SHEET_NAME = 'Activities';
const RANGE = `${SHEET_NAME}!A:H`;

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse(res: any) {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${errText}`);
  }
  return res.json();
}

function activityToRow(activity: any): string[] {
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

function rowToActivity(row: string[]): any | null {
  if (!row || row.length < 6) return null;
  const [date, startTime, endTime, duration, category, description, createdAt, id] = row;
  if (!date || !startTime || !endTime) return null;

  return {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date,
    startTime,
    endTime,
    durationMinutes: parseInt(duration, 10) || 0,
    category,
    description: description || '',
    createdAt: createdAt || new Date().toISOString(),
  };
}

async function fetchRawValues(token: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}`;
  const data = await handleResponse(await fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
  return data.values || [];
}

export async function fetchAllActivities(token: string, spreadsheetId: string) {
  const values = await fetchRawValues(token, spreadsheetId);
  if (values.length <= 1) return [];
  const rows = values.slice(1);
  return rows.map(r => rowToActivity(r)).filter(a => a !== null);
}

export async function appendActivity(token: string, spreadsheetId: string, activity: any) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await handleResponse(
    await fetch(url, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify({ values: [activityToRow(activity)] }),
    })
  );
}

export async function updateActivityInSheet(token: string, spreadsheetId: string, activity: any) {
  const values = await fetchRawValues(token, spreadsheetId);
  const index = values.findIndex(row => row[7] === activity.id || row[6] === activity.createdAt);
  
  if (index === -1) throw new Error('Activity not found in sheet.');

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

export async function deleteActivityFromSheet(token: string, spreadsheetId: string, activityId: string, createdAt: string) {
  const values = await fetchRawValues(token, spreadsheetId);
  const index = values.findIndex(row => row[7] === activityId || row[6] === createdAt);
  
  if (index === -1) throw new Error('Activity not found in sheet.');

  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const info = await handleResponse(await fetch(infoUrl, { headers: makeHeaders(token) }));
  
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
