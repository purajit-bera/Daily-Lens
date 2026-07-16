import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '@/config/settings';
import { fetchSettings, syncSettings } from '@/services/settingsApi';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { accessToken, spreadsheetId, isAuthenticated } = useAuth();
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch when authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !spreadsheetId) {
      // If not authenticated, we could load from localStorage as fallback, but the user requested cloud truth.
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    
    fetchSettings(accessToken, spreadsheetId)
      .then(fetchedSettings => {
        if (isMounted) {
          setSettings(fetchedSettings);
          setError(null);
        }
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        if (isMounted) setError('Failed to load settings from Google Sheets.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [isAuthenticated, accessToken, spreadsheetId]);

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!accessToken || !spreadsheetId) return;
    
    const newSettings = { ...settings, [key]: value };
    // Optimistic update
    setSettings(newSettings);
    setError(null);

    try {
      await syncSettings(accessToken, spreadsheetId, newSettings);
    } catch (err) {
      console.error('Failed to sync setting:', err);
      // Revert on failure
      setSettings(settings);
      setError('Failed to save setting to Google Sheets.');
    }
  }, [settings, accessToken, spreadsheetId]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, isLoading, error }}>
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
