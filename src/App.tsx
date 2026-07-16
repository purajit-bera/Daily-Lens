import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LoadingProvider } from '@/context/LoadingContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { ActivityEntry } from '@/pages/ActivityEntry';
import { Statistics } from '@/pages/Statistics';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// ── Protected route wrapper ───────────────────────────────────

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Authenticating…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ActivityEntry />} />
        <Route path="/stats" element={<Statistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  if (!clientId) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
          <h1 className="text-xl font-bold text-white mb-3">⚙️ Setup Required</h1>
          <p className="text-sm text-slate-400 mb-4">
            The <code className="text-brand-400">VITE_GOOGLE_CLIENT_ID</code> environment variable is not set.
          </p>
          <p className="text-sm text-slate-400">
            Please create a <code className="text-slate-300">.env</code> file from{' '}
            <code className="text-slate-300">.env.example</code> and add your Google OAuth Client ID.
            See <code className="text-slate-300">SETUP.md</code> for detailed instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <LoadingProvider>
              <BrowserRouter>
                <ProtectedRoutes />
              </BrowserRouter>
            </LoadingProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
