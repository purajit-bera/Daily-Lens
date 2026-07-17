import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { fetchOverrides, syncOverrides, type SleepOverride } from '@/services/overridesApi';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';

interface OverridesContextType {
  overrides: Record<string, SleepOverride>;
  updateOverride: (date: string, wakeUpTime: string, bedtime: string) => Promise<void>;
  clearOverride: (date: string) => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const OverridesContext = createContext<OverridesContextType | undefined>(undefined);

export function OverridesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { startOperation, endOperation, showCriticalError } = useLoading();
  
  const [overrides, setOverrides] = useState<Record<string, SleepOverride>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      setIsLoading(true);
      startOperation('overrides', 'Loading your schedule overrides...');
      fetchOverrides()
        .then(fetchedOverrides => {
          if (isMounted) {
            setOverrides(fetchedOverrides || {});
            setIsInitialized(true);
          }
        })
        .catch(err => {
          console.error('Failed to load overrides:', err);
          if (isMounted) {
            setError(err.message);
            showCriticalError('Couldn\'t load your daily schedule overrides.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
            endOperation('overrides');
          }
        });
    } else {
      setOverrides({});
      setIsLoading(false);
      setIsInitialized(false);
    }
    
    return () => { isMounted = false; };
  }, [isAuthenticated, startOperation, endOperation, showCriticalError]);

  const updateOverride = useCallback(async (date: string, wakeUpTime: string, bedtime: string) => {
    const previousOverrides = { ...overrides };
    const newOverrides = { ...overrides, [date]: { wakeUpTime, bedtime } };
    
    setOverrides(newOverrides);

    try {
      setIsLoading(true);
      await syncOverrides(newOverrides);
    } catch (err) {
      console.error('Failed to save override:', err);
      setError(err instanceof Error ? err.message : 'Failed to save override');
      setOverrides(previousOverrides);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [overrides]);

  const clearOverride = useCallback(async (date: string) => {
    const previousOverrides = { ...overrides };
    const newOverrides = { ...overrides };
    delete newOverrides[date];
    
    setOverrides(newOverrides);

    try {
      setIsLoading(true);
      await syncOverrides(newOverrides);
    } catch (err) {
      console.error('Failed to clear override:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear override');
      setOverrides(previousOverrides);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [overrides]);

  return (
    <OverridesContext.Provider value={{ overrides, updateOverride, clearOverride, isLoading, isInitialized, error }}>
      {children}
    </OverridesContext.Provider>
  );
}

export function useOverrides() {
  const context = useContext(OverridesContext);
  if (context === undefined) {
    throw new Error('useOverrides must be used within an OverridesProvider');
  }
  return context;
}
