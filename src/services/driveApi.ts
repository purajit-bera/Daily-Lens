// Google Drive API helpers — find or create the activity spreadsheet

const SPREADSHEET_NAME = 'Daily Activity Logger';
const SESSION_KEY = 'dal_spreadsheet_id';

/**
 * Search Drive for an existing "Daily Activity Logger" spreadsheet.
 * Returns the spreadsheetId if found, null otherwise.
 */
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
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Drive API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id as string;
  }
  return null;
}

/**
 * Create a new spreadsheet with the headers row pre-populated.
 */
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
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Sheets API error: ${res.status}`);
  }

  const data = await res.json();
  return data.spreadsheetId as string;
}

/**
 * Find or create the "Daily Activity Logger" spreadsheet.
 * Result is cached in sessionStorage for the current session.
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
  // Check session cache first
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached) return cached;

  // Try to find existing
  let spreadsheetId = await findSpreadsheet(accessToken);

  // Create if not found
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(accessToken);
  }

  // Cache for this session
  sessionStorage.setItem(SESSION_KEY, spreadsheetId);
  return spreadsheetId;
}

export function clearSpreadsheetCache(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getCachedSpreadsheetId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}
