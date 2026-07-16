import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { Activity, Clock, Database, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Smart Time Tracking',
    desc: 'Log activities in under 10 seconds with auto-synced time fields.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: 'Your Data, Your Sheet',
    desc: 'Everything stored in a Google Sheet you own. No servers.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Rich Visual Analytics',
    desc: 'Charts, heatmaps, insights & a daily productivity score.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Private & Secure',
    desc: 'OAuth only. Your data never touches our servers.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

export function LoginPage() {
  const { login, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden">

      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-700/15 blur-[100px]" />
        <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-700/10 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Nav bar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Daily Lens</span>
        </div>
        <div className="text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          Free · No subscription
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">

        {/* Badge */}
        <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">Backed by Google Sheets — you own your data</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-center leading-[1.05] tracking-tight mb-6 max-w-3xl">
          Know exactly{' '}
          <span
            className="text-transparent"
            style={{
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            }}
          >
            how you spend
          </span>{' '}
          your days
        </h1>

        <p className="text-lg text-slate-400 text-center max-w-xl mb-12 leading-relaxed">
          Log activities in seconds. Spot patterns. Build better habits.
          Everything syncs straight to a Google Sheet you control.
        </p>

        {/* Sign in card */}
        <div className="w-full max-w-sm">
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
            {/* Top glow line */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-4 flex flex-col items-center gap-3">
                <LoadingSpinner size="md" />
                <p className="text-sm text-slate-400">Connecting to Google…</p>
              </div>
            ) : (
              <>
                <button
                  id="google-signin-btn"
                  onClick={login}
                  className="group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-200 bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-black/20 active:scale-[0.98]"
                >
                  {/* Google G logo */}
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                  <ArrowRight className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>

                <p className="mt-5 text-xs text-slate-500 text-center leading-relaxed">
                  Creates a{' '}
                  <span className="text-slate-400 font-medium">"Daily Activity Logger"</span>
                  {' '}sheet in your Drive.
                  Access limited to files this app creates.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-16 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-200"
            >
              <div className={`flex-shrink-0 p-2.5 rounded-xl ${bg} ${color}`}>
                {icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-slate-600">
        No account needed · No data stored on our servers · Open in seconds
      </footer>
    </div>
  );
}
