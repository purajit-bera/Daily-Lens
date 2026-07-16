import { useState, useCallback, useEffect } from 'react';
import type { Activity } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext';
import {
  fetchActivitiesByDate,
  fetchAllActivities,
  appendActivity,
  fetchRecentActivities,
  updateActivityInSheet,
  deleteActivityFromSheet,
} from '@/services/sheetsApi';

interface UseActivitiesOptions {
  date?: string;
  autoFetch?: boolean;
}

interface UseActivitiesReturn {
  activities: Activity[];
  allActivities: Activity[];
  recentActivities: Activity[];
  error: string | null;
  // Kept for backward compatibility, though global loader blocks UI anyway
  isLoading: boolean;
  isSaving: boolean;
  saveActivity: (activity: Activity) => Promise<boolean>;
  updateActivity: (activity: Activity) => Promise<boolean>;
  deleteActivity: (activityId: string, createdAt: string) => Promise<boolean>;
  refetchByDate: (date: string) => Promise<void>;
  refetchAll: () => Promise<void>;
  refetchRecent: (days?: number) => Promise<void>;
  clearError: () => void;
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { date, autoFetch = false } = options;
  const { accessToken, spreadsheetId, isAuthenticated } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refetchByDate = useCallback(
    async (targetDate: string) => {
      if (!accessToken || !spreadsheetId) return;
      setIsLoading(true);
      showLoading('Loading activities...');
      setError(null);
      try {
        const data = await fetchActivitiesByDate(accessToken, spreadsheetId, targetDate);
        setActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities.');
      } finally {
        setIsLoading(false);
        hideLoading();
      }
    },
    [accessToken, spreadsheetId, showLoading, hideLoading]
  );

  const refetchAll = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsLoading(true);
    showLoading('Syncing with Google Sheets...');
    setError(null);
    try {
      const data = await fetchAllActivities(accessToken, spreadsheetId);
      setAllActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities.');
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  }, [accessToken, spreadsheetId, showLoading, hideLoading]);

  const refetchRecent = useCallback(
    async (days = 30) => {
      if (!accessToken || !spreadsheetId) return;
      setIsLoading(true);
      showLoading('Loading activities...');
      setError(null);
      try {
        const data = await fetchRecentActivities(accessToken, spreadsheetId, days);
        setRecentActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recent activities.');
      } finally {
        setIsLoading(false);
        hideLoading();
      }
    },
    [accessToken, spreadsheetId, showLoading, hideLoading]
  );

  const saveActivity = useCallback(
    async (activity: Activity): Promise<boolean> => {
      if (!accessToken || !spreadsheetId) {
        setError('Not authenticated. Please log in again.');
        return false;
      }
      setIsSaving(true);
      showLoading('Saving activity...');
      setError(null);
      try {
        await appendActivity(accessToken, spreadsheetId, activity);
        // Optimistically add to local state
        setActivities(prev => (activity.date === date ? [...prev, activity] : prev));
        setRecentActivities(prev => [...prev, activity]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save activity.');
        return false;
      } finally {
        setIsSaving(false);
        hideLoading();
      }
    },
    [accessToken, spreadsheetId, date, showLoading, hideLoading]
  );

  const updateActivity = useCallback(
    async (activity: Activity): Promise<boolean> => {
      if (!accessToken || !spreadsheetId) return false;
      setIsSaving(true);
      showLoading('Updating activity...');
      setError(null);
      try {
        await updateActivityInSheet(accessToken, spreadsheetId, activity);
        
        // Optimistically update local state
        const updateFn = (prev: Activity[]) =>
          prev.map(a => (a.id === activity.id ? activity : a));
        
        setActivities(prev => {
          if (activity.date !== date) return prev.filter(a => a.id !== activity.id); // It moved to another date
          const exists = prev.some(a => a.id === activity.id);
          return exists ? updateFn(prev) : [...prev, activity];
        });
        setRecentActivities(updateFn);
        setAllActivities(updateFn);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update activity.');
        return false;
      } finally {
        setIsSaving(false);
        hideLoading();
      }
    },
    [accessToken, spreadsheetId, date, showLoading, hideLoading]
  );

  const deleteActivity = useCallback(
    async (activityId: string, createdAt: string): Promise<boolean> => {
      if (!accessToken || !spreadsheetId) return false;
      setIsSaving(true);
      showLoading('Deleting activity...');
      setError(null);
      try {
        await deleteActivityFromSheet(accessToken, spreadsheetId, activityId, createdAt);
        
        // Optimistically remove from local state
        const removeFn = (prev: Activity[]) => prev.filter(a => a.id !== activityId);
        setActivities(removeFn);
        setRecentActivities(removeFn);
        setAllActivities(removeFn);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete activity.');
        return false;
      } finally {
        setIsSaving(false);
        hideLoading();
      }
    },
    [accessToken, spreadsheetId, showLoading, hideLoading]
  );

  // Auto-fetch on mount if enabled and authenticated
  useEffect(() => {
    if (autoFetch && isAuthenticated && date) {
      refetchByDate(date);
    }
  }, [autoFetch, isAuthenticated, date, refetchByDate]);

  return {
    activities,
    allActivities,
    recentActivities,
    isLoading,
    isSaving,
    error,
    saveActivity,
    updateActivity,
    deleteActivity,
    refetchByDate,
    refetchAll,
    refetchRecent,
    clearError,
  };
}
