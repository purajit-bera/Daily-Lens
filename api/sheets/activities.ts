import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../utils/session.js';
import { refreshAccessToken } from '../utils/googleClient.js';
import { fetchAllActivities, appendActivity, updateActivityInSheet, deleteActivityFromSheet } from '../utils/sheetsClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = getSession(req);

  if (!session || !session.refresh_token || !session.spreadsheetId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const accessToken = await refreshAccessToken(session.refresh_token);

    if (req.method === 'GET') {
      const activities = await fetchAllActivities(accessToken, session.spreadsheetId);
      return res.status(200).json(activities);
    } 
    
    else if (req.method === 'POST') {
      const { activity } = req.body;
      if (!activity) return res.status(400).json({ error: 'Missing activity body' });
      
      await appendActivity(accessToken, session.spreadsheetId, activity);
      return res.status(200).json({ success: true });
    }
    
    else if (req.method === 'PUT') {
      const { activity } = req.body;
      if (!activity) return res.status(400).json({ error: 'Missing activity body' });
      
      await updateActivityInSheet(accessToken, session.spreadsheetId, activity);
      return res.status(200).json({ success: true });
    }
    
    else if (req.method === 'DELETE') {
      const { activityId, createdAt } = req.query;
      if (!activityId || !createdAt) return res.status(400).json({ error: 'Missing query parameters' });
      
      await deleteActivityFromSheet(accessToken, session.spreadsheetId, activityId as string, createdAt as string);
      return res.status(200).json({ success: true });
    }
    
    else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

  } catch (error: any) {
    console.error('Sheets API Error:', error);
    return res.status(500).json({ error: error.message || 'Server Error' });
  }
}
