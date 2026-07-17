import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../utils/session.js';
import { refreshAccessToken, fetchUserInfo } from '../utils/googleClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = getSession(req);

  if (!session || !session.refresh_token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Refresh the access token to ensure the refresh token is still valid
    // and to fetch fresh user info.
    const accessToken = await refreshAccessToken(session.refresh_token);
    const userInfo = await fetchUserInfo(accessToken);

    return res.status(200).json({
      user: {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        sub: userInfo.sub,
      },
      spreadsheetId: session.spreadsheetId || null,
    });
  } catch (error: any) {
    console.error('Session restore error:', error);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}
