import { Link, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Sun, Moon, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/components/ui';
import { RefreshCw } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Log Activity', icon: Activity, id: 'nav-log' },
  { to: '/stats', label: 'Statistics', icon: BarChart3, id: 'nav-stats' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, spreadsheetId, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isSyncing } = useLoading();
  const { pathname } = useLocation();

  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    : null;

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{ backgroundColor: isDark ? '#0a0a0f' : '#f8fafc', color: isDark ? '#f1f5f9' : '#0f172a' }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(99,102,241,0.08)' }} />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.06)' }} />
      </div>

      {/* Navbar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(10,10,15,0.8)' : 'rgba(248,250,252,0.8)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
            >
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold hidden sm:block" style={{ color: isDark ? '#fff' : '#0f172a' }}>
              Daily Lens
            </span>
          </div>

          {/* Nav */}
          <nav
            className="flex items-center p-1 rounded-2xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
          >
            {NAV_LINKS.map(({ to, label, icon: Icon, id }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  id={id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={
                    isActive
                      ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }
                      : { color: isDark ? '#94a3b8' : '#64748b' }
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSyncing && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(14,165,233,0.1)', color: isDark ? '#38bdf8' : '#0ea5e9' }}
                title="Syncing with Google Sheets..."
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Syncing</span>
              </div>
            )}
            
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="open-sheet-link"
                title="Open your Google Sheet"
                className="p-2 rounded-xl text-slate-400 hover:text-white transition-all duration-200"
                style={{ ':hover': { background: 'rgba(255,255,255,0.1)' } } as React.CSSProperties}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              id="theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Light mode' : 'Dark mode'}
              className="p-2 rounded-xl text-slate-400 hover:text-white transition-all duration-200"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user && (
              <div className="flex items-center gap-2">
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2"
                  style={{ '--tw-ring-color': 'rgba(99,102,241,0.4)' } as React.CSSProperties}
                  onError={(e) => {
                     e.currentTarget.onerror = null;
                     e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                  }}
                />
                <button
                  id="logout-btn"
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
