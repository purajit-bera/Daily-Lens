import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import type { GoogleUser, AuthState } from '@/types';
import { GOOGLE_SCOPES } from '@/services/googleAuth';
import { clearSpreadsheetCache } from '@/services/driveApi';
import { useLoading } from '@/context/LoadingContext';

// ── Context type ──────────────────────────────────────────────

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => void;
}

// ── Default state ─────────────────────────────────────────────

const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null, // No longer used, but kept in type for compatibility if needed elsewhere
  spreadsheetId: null, // Fetched from backend now
  isLoading: true, // Start true for initial session check
  error: null,
};

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  ...defaultState,
  login: () => {},
  logout: () => {},
});

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);
  const { startOperation, endOperation, showCriticalError } = useLoading();

  const setLoading = (isLoading: boolean) =>
    setState(s => ({ ...s, isLoading, error: null }));

  const setError = (error: string) =>
    setState(s => ({ ...s, isLoading: false, error }));

  // Check session on mount
  useEffect(() => {
    let mounted = true;
    startOperation('auth', 'Verifying your session...');
    
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setState({
              isAuthenticated: true,
              user: data.user,
              accessToken: 'backend-managed',
              spreadsheetId: data.spreadsheetId,
              isLoading: false,
              error: null,
            });
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      } finally {
        if (mounted) endOperation('auth');
      }
    }
    
    checkSession();
    return () => { mounted = false; };
  }, [startOperation, endOperation]);

  const handleLoginSuccess = useCallback(async (codeResponse: any) => {
    try {
      setLoading(true);
      startOperation('auth_exchange', 'Connecting to your account...');
      
      const res = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: codeResponse.code,
          redirectUri: window.location.origin, // or postmessage
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Authentication failed. Please try again.');
      }

      const data = await res.json();
      
      // We need to fetch `/api/auth/me` to get spreadsheetId since exchange might not return it directly,
      // or we can update `exchange` to return `spreadsheetId` (which we did).
      
      setState({
        isAuthenticated: true,
        user: data.user,
        accessToken: 'backend-managed',
        spreadsheetId: data.spreadsheetId || 'backend-managed',
        isLoading: false,
        error: null,
      });
      
      // Reload page to re-fetch settings/activities with fresh session
      window.location.reload();
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
      showCriticalError(msg);
    } finally {
      endOperation('auth_exchange');
    }
  }, [startOperation, endOperation, showCriticalError]);

  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (err) => {
      setError(err.error_description ?? 'Google login failed. Please try again.');
    },
    scope: GOOGLE_SCOPES,
    flow: 'auth-code',
  });

  const login = useCallback(() => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    googleLogin();
  }, [googleLogin]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed', e);
    }
    clearSpreadsheetCache();
    setState({ ...defaultState, isLoading: false });
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
