import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../utils/session.js';
import { refreshAccessToken } from '../utils/googleClient.js';
import { fetchOverridesRaw, syncOverridesRaw } from '../utils/overridesClient.js';

// We expect overrides to be returned as { [date: string]: { wakeUpTime: string, bedtime: string } }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = getSession(req);
    if (!session || !session.refresh_token || !session.spreadsheetId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = await refreshAccessToken(session.refresh_token);

    if (req.method === 'GET') {
      const raw = await fetchOverridesRaw(accessToken, session.spreadsheetId);
      const overrides: Record<string, { wakeUpTime: string, bedtime: string }> = {};
      
      // raw is [['2023-01-01', '08:00', '23:00'], ...]
      for (const row of raw) {
        if (row.length >= 3) {
          overrides[row[0]] = {
            wakeUpTime: row[1],
            bedtime: row[2]
          };
        }
      }
      return res.status(200).json(overrides);
    }

    if (req.method === 'POST') {
      // Body expects a complete overrides object to save
      const overrides = req.body;
      if (!overrides || typeof overrides !== 'object') {
        return res.status(400).json({ error: 'Invalid overrides format' });
      }

      const rows: string[][] = [];
      for (const [date, val] of Object.entries(overrides)) {
        const { wakeUpTime, bedtime } = val as any;
        rows.push([date, wakeUpTime || '00:00', bedtime || '00:00']);
      }

      await syncOverridesRaw(accessToken, session.spreadsheetId, rows);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('Overrides API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
