

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    client_secret: GOOGLE_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to exchange token: ${errorText}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token: string;
  }>;
}

/**
 * Get a fresh access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    client_secret: GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  return data.access_token;
}

/**
 * Get User Info from Google
 */
export async function fetchUserInfo(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return res.json() as Promise<{
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
  }>;
}
