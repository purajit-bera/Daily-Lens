import React, { createContext, useContext, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/ui';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showSyncing: () => void;
  hideSyncing: () => void;
  isSyncing: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  showLoading: () => {},
  hideLoading: () => {},
  showSyncing: () => {},
  hideSyncing: () => {},
  isSyncing: false,
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string>('Please wait...');

  const showLoading = useCallback((msg = 'Please wait...') => {
    setMessage(msg);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const showSyncing = useCallback(() => setIsSyncing(true), []);
  const hideSyncing = useCallback(() => setIsSyncing(false), []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, showSyncing, hideSyncing, isSyncing }}>
      {children}
      {isLoading && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm transition-all duration-300 animate-fade-in pointer-events-auto"
          style={{ cursor: 'wait' }}
        >
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50 flex flex-col items-center gap-4 animate-scale-in">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium text-slate-300">{message}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}
