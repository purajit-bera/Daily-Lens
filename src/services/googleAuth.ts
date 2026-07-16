// Google OAuth configuration and helpers

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'profile',
  'email',
].join(' ');

export interface GoogleTokenInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

/**
 * Fetch user profile information using the access token.
 * Uses the Google UserInfo endpoint.
 */
export async function fetchUserInfo(accessToken: string): Promise<GoogleTokenInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error('Failed to fetch user info');
  }
  return res.json() as Promise<GoogleTokenInfo>;
}
