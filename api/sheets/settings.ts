import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../utils/session.js';
import { refreshAccessToken } from '../utils/googleClient.js';
import { fetchSettingsRaw, syncSettingsRaw } from '../utils/settingsClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = getSession(req);

  if (!session || !session.refresh_token || !session.spreadsheetId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const accessToken = await refreshAccessToken(session.refresh_token);

    if (req.method === 'GET') {
      const values = await fetchSettingsRaw(accessToken, session.spreadsheetId);
      return res.status(200).json({ values });
    } 
    
    else if (req.method === 'PUT') {
      const { values } = req.body;
      if (!values || !Array.isArray(values)) {
        return res.status(400).json({ error: 'Missing or invalid values array' });
      }
      
      await syncSettingsRaw(accessToken, session.spreadsheetId, values);
      return res.status(200).json({ success: true });
    }
    
    else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

  } catch (error: any) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: error.message || 'Server Error' });
  }
}
