import jwt from 'jsonwebtoken';
import { parseCookie, stringifySetCookie } from 'cookie';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development';
const COOKIE_NAME = 'dal_session';
const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

export interface SessionPayload {
  refresh_token: string;
  spreadsheetId?: string | null;
}

/**
 * Encrypt payload into a signed JWT and set it as an HttpOnly cookie.
 */
export function setSessionCookie(res: VercelResponse, payload: SessionPayload) {
  const token = jwt.sign(payload, SESSION_SECRET, {
    expiresIn: SESSION_EXPIRY,
  });

  const serializedCookie = stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });

  res.setHeader('Set-Cookie', serializedCookie);
}

/**
 * Extract and verify session payload from incoming request cookies.
 */
export function getSession(req: VercelRequest): SessionPayload | null {
  const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
  const token = cookies[COOKIE_NAME];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as SessionPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(res: VercelResponse) {
  const serializedCookie = stringifySetCookie({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  res.setHeader('Set-Cookie', serializedCookie);
}
