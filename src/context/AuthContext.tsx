import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import type { GoogleUser, AuthState } from '@/types';
import { GOOGLE_SCOPES, fetchUserInfo } from '@/services/googleAuth';
import { findOrCreateSpreadsheet, clearSpreadsheetCache } from '@/services/driveApi';

// ── Context type ──────────────────────────────────────────────

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'dal_auth_state';

// ── Default state ─────────────────────────────────────────────

const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  spreadsheetId: null,
  isLoading: false,
  error: null,
};

function getInitialState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.accessToken && parsed.user && parsed.spreadsheetId) {
        return {
          ...defaultState,
          isAuthenticated: true,
          user: parsed.user,
          accessToken: parsed.accessToken,
          spreadsheetId: parsed.spreadsheetId,
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse auth state', e);
  }
  return defaultState;
}

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  ...defaultState,
  login: () => {},
  logout: () => {},
});

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);
  const tokenRef = useRef<string | null>(state.accessToken);

  // Persist state changes to localStorage
  useEffect(() => {
    if (state.isAuthenticated && state.accessToken && state.user && state.spreadsheetId) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken: state.accessToken,
        user: state.user,
        spreadsheetId: state.spreadsheetId,
      }));
      tokenRef.current = state.accessToken;
    } else if (!state.isAuthenticated) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      tokenRef.current = null;
    }
  }, [state.isAuthenticated, state.accessToken, state.user, state.spreadsheetId]);

  const setLoading = (isLoading: boolean) =>
    setState(s => ({ ...s, isLoading, error: null }));

  const setError = (error: string) =>
    setState(s => ({ ...s, isLoading: false, error }));

  const handleLoginSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    try {
      setLoading(true);
      const accessToken = tokenResponse.access_token;
      tokenRef.current = accessToken;

      // Fetch user profile
      const userInfo = await fetchUserInfo(accessToken);
      const user: GoogleUser = {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        sub: userInfo.sub,
      };

      // Find or create the spreadsheet
      const spreadsheetId = await findOrCreateSpreadsheet(accessToken);

      setState({
        isAuthenticated: true,
        user,
        accessToken,
        spreadsheetId,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
    }
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (err) => {
      setError(err.error_description ?? 'Google login failed. Please try again.');
    },
    scope: GOOGLE_SCOPES,
    flow: 'implicit',
  });

  const login = useCallback(() => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    googleLogin();
  }, [googleLogin]);

  const logout = useCallback(() => {
    tokenRef.current = null;
    clearSpreadsheetCache();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState(defaultState);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => logout();
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
