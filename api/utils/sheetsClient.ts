

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

async function fetchRawValues(token: string, spreadsheetId: string, customRange?: string): Promise<string[][]> {
  const rangeToFetch = customRange || RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeToFetch)}`;
  const data = await handleResponse(await fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
  return data.values || [];
}

const verifiedSheets = new Set<string>();

async function verifyAndProtectSheet(token: string, spreadsheetId: string) {
  if (verifiedSheets.has(spreadsheetId)) return;
  verifiedSheets.add(spreadsheetId);

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const info = await handleResponse(await fetch(url, { headers: makeHeaders(token) }));
    
    const sheet = info.sheets.find((s: any) => s.properties.title === SHEET_NAME);
    if (!sheet) return;

    const sheetId = sheet.properties.sheetId;
    const requests: any[] = [];

    // Check if column H is hidden
    const colMetadata = sheet.data?.[0]?.columnMetadata;
    const isHidden = colMetadata && colMetadata.length > 7 ? colMetadata[7]?.hiddenByUser : false;
    
    // Check if protected
    const isProtected = sheet.protectedRanges?.some((pr: any) => 
      pr.range.startColumnIndex === 7 && pr.range.endColumnIndex === 8
    );

    if (!isHidden) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
          properties: { hiddenByUser: true },
          fields: 'hiddenByUser'
        }
      });
    }

    if (!isProtected) {
      requests.push({
        addProtectedRange: {
          protectedRange: {
            range: { sheetId, startColumnIndex: 7, endColumnIndex: 8 },
            description: 'Internal System ID Column',
            warningOnly: false,
            editors: {} // Leaves it to owner only
          }
        }
      });
    }

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: makeHeaders(token),
        body: JSON.stringify({ requests }),
      });
    }

    // Ensure header is "Activity ID"
    const headerVals = await fetchRawValues(token, spreadsheetId, `${SHEET_NAME}!H1`);
    if (!headerVals[0] || headerVals[0][0] !== 'Activity ID') {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME + '!H1')}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: makeHeaders(token),
        body: JSON.stringify({ values: [['Activity ID']] }),
      });
    }

  } catch (error) {
    console.error('Failed to verify and protect sheet:', error);
    verifiedSheets.delete(spreadsheetId); // allow retry
  }
}

export async function fetchAllActivities(token: string, spreadsheetId: string) {
  // Run verification non-blocking to prevent slow initial load if possible, 
  // but since we need it verified, we await it. It's cached in memory so it only hits once per lambda lifecycle.
  await verifyAndProtectSheet(token, spreadsheetId);

  const values = await fetchRawValues(token, spreadsheetId);
  if (values.length <= 1) return [];
  
  let needsUpdate = false;
  const updates: { range: string, values: string[][] }[] = [];
  
  const rows = values.slice(1);
  const parsed = rows.map((r, i) => {
    let id = r[7];
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      r[7] = id;
      needsUpdate = true;
      updates.push({
        range: `${SHEET_NAME}!H${i + 2}`,
        values: [[id]]
      });
    }
    return rowToActivity(r);
  }).filter(a => a !== null);

  if (needsUpdate && updates.length > 0) {
    // Fire and forget batch update for missing IDs to not block response
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates
      }),
    }).catch(e => console.error('Failed to update missing IDs:', e));
  }

  return parsed;
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
