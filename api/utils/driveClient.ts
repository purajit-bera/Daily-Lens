

const SPREADSHEET_NAME = 'Daily Activity Logger';

async function findSpreadsheet(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive API error finding spreadsheet: ${res.status} ${errText}`);
  }

  const data = await res.json() as any;
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

async function createSpreadsheet(accessToken: string): Promise<string> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        {
          properties: { title: 'Activities', index: 0 },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    'Date',
                    'Start Time',
                    'End Time',
                    'Duration (min)',
                    'Category',
                    'Activity',
                    'Created At',
                  ].map(v => ({ userEnteredValue: { stringValue: v } })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API error creating spreadsheet: ${res.status} ${errText}`);
  }

  const data = await res.json() as any;
  return data.spreadsheetId;
}

export async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
  let spreadsheetId = await findSpreadsheet(accessToken);
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(accessToken);
  }
  return spreadsheetId;
}
