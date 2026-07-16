import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '@/config/settings';
import { fetchSettings, syncSettings } from '@/services/settingsApi';
import { getCachedSettings, setCachedSettings } from '@/services/cacheService';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { startOperation, endOperation, showCriticalError } = useLoading();
  
  const [settings, setSettings] = useState<Settings>(getCachedSettings);
  const [isLoading, setIsLoading] = useState(false); // Background sync status
  const [isInitialized, setIsInitialized] = useState(true); // Always initialized from cache
  const [error, setError] = useState<string | null>(null);

  // Initial fetch when authenticated
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      setIsLoading(true);
      startOperation('settings', 'Restoring your preferences...');
      fetchSettings()
        .then(fetchedSettings => {
          if (isMounted) {
            const merged = { ...DEFAULT_SETTINGS, ...(fetchedSettings || {}) };
            setSettings(merged);
            setCachedSettings(merged);
            setIsInitialized(true);
          }
        })
        .catch(err => {
          console.error('Failed to load settings:', err);
          if (isMounted) {
            setError(err.message);
            showCriticalError('Couldn\'t restore your preferences.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
            endOperation('settings');
          }
        });
    } else {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
    }
    
    return () => { isMounted = false; };
  }, [isAuthenticated, startOperation, endOperation, showCriticalError]);

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const previousSettings = { ...settings };
    const newSettings = { ...settings, [key]: value };
    
    // Optimistic update
    setSettings(newSettings);
    setCachedSettings(newSettings);

    try {
      setIsLoading(true);
      // We don't block the UI with startOperation here, just show background sync status
      await syncSettings(newSettings);
    } catch (err) {
      console.error('Failed to save setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to save setting');
      // Revert on error
      setSettings(previousSettings);
      setCachedSettings(previousSettings);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, isLoading, isInitialized, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
