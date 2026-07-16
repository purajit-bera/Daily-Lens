import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCodeForTokens, fetchUserInfo } from '../utils/googleClient';
import { findOrCreateSpreadsheet } from '../utils/driveClient';
import { setSessionCookie } from '../utils/session';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri || 'postmessage');
    
    if (!tokens.refresh_token) {
      // If the user already authorized the app, Google might not send a refresh token
      // unless prompt='consent' was used.
      return res.status(400).json({ 
        error: 'No refresh token received. Please revoke app access in your Google Account and try again, or ensure prompt=consent is used.' 
      });
    }

    // 2. Fetch User Info using the new access token
    const userInfo = await fetchUserInfo(tokens.access_token);

    // 3. Find or Create Spreadsheet
    const spreadsheetId = await findOrCreateSpreadsheet(tokens.access_token);

    // 4. Set secure session cookie
    setSessionCookie(res, {
      refresh_token: tokens.refresh_token,
      spreadsheetId,
    });

    // 4. Return user info and access token (short-lived, for immediate frontend use if needed, but preferably frontend just relies on cookies)
    // Actually, to make it fully secure, we don't even need to send access_token to frontend.
    // The frontend will just call our API.
    return res.status(200).json({
      user: {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        sub: userInfo.sub,
      }
    });
  } catch (error: any) {
    console.error('Exchange error:', error);
    return res.status(500).json({ error: error.message || 'Authentication failed' });
  }
}
