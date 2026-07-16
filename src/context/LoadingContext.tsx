import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui';

export interface LoadingOperation {
  id: string;
  message: string;
  startTime: number;
}

interface LoadingContextType {
  startOperation: (id: string, message: string) => void;
  updateOperation: (id: string, message: string) => void;
  endOperation: (id: string) => void;
  showSyncing: () => void;
  hideSyncing: () => void;
  isSyncing: boolean;
  showCriticalError: (error: string) => void;
  clearCriticalError: () => void;
  
  // Legacy methods for backward compatibility during migration
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<LoadingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const startOperation = useCallback((id: string, message: string) => {
    setOperations(prev => {
      const filtered = prev.filter(op => op.id !== id);
      return [...filtered, { id, message, startTime: performance.now() }];
    });
  }, []);

  const updateOperation = useCallback((id: string, message: string) => {
    setOperations(prev => prev.map(op => op.id === id ? { ...op, message } : op));
  }, []);

  const endOperation = useCallback((id: string) => {
    setOperations(prev => {
      const op = prev.find(o => o.id === id);
      if (op) {
        console.log(`[Performance] Operation '${id}' took ${(performance.now() - op.startTime).toFixed(2)}ms`);
      }
      return prev.filter(o => o.id !== id);
    });
  }, []);

  const showCriticalError = useCallback((error: string) => setCriticalError(error), []);
  const clearCriticalError = useCallback(() => setCriticalError(null), []);

  const showLoading = useCallback((msg = 'Please wait...') => startOperation('legacy', msg), [startOperation]);
  const hideLoading = useCallback(() => endOperation('legacy'), [endOperation]);

  const showSyncing = useCallback(() => setIsSyncing(true), []);
  const hideSyncing = useCallback(() => setIsSyncing(false), []);

  // Intelligent Status Updates
  useEffect(() => {
    if (operations.length === 0) return;

    const intervalId = setInterval(() => {
      const now = performance.now();
      setOperations(prev => prev.map(op => {
        if (now - op.startTime > 2500) {
          if (!op.message.includes("Still") && !op.message.includes("taking a little longer")) {
            let newMessage = op.message;
            if (op.id === 'activities') newMessage = "Still loading your activities...";
            else if (op.id === 'settings') newMessage = "Still restoring your preferences...";
            else if (op.id === 'auth') newMessage = "Still verifying your session...";
            else newMessage = "This is taking a little longer than usual...";
            return { ...op, message: newMessage };
          }
        }
        return op;
      }));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [operations.length]);

  const activeOp = operations[operations.length - 1]; 
  const isLoading = operations.length > 0;
  const isVisible = isLoading || criticalError !== null;

  return (
    <LoadingContext.Provider value={{
      startOperation, updateOperation, endOperation,
      showSyncing, hideSyncing, isSyncing,
      showCriticalError, clearCriticalError,
      showLoading, hideLoading
    }}>
      {children}
      
      {/* Overlay with smooth fade in/out */}
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm transition-all duration-500 ease-in-out ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ cursor: isLoading ? 'wait' : 'default' }}
      >
        <div className={`bg-[#111118] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50 flex flex-col items-center gap-4 transition-transform duration-500 ease-out ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}>
          {criticalError ? (
            <div className="text-center flex flex-col items-center max-w-sm">
              <div className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-base font-medium text-slate-200 mb-6">{criticalError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand-500/20"
              >
                Retry Connection
              </button>
            </div>
          ) : activeOp ? (
            <>
              <LoadingSpinner size="lg" />
              <p className="text-sm font-medium text-slate-300 transition-all duration-300 text-center animate-fade-in">
                {activeOp.message}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}
