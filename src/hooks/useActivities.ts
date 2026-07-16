import { useState, useCallback, useEffect } from 'react';
import type { Activity } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext';
import {
  fetchActivitiesByDate, // keeping for backward compatibility if needed, though we will mainly fetch all
  fetchAllActivities,
  appendActivity,
  fetchRecentActivities,
  updateActivityInSheet,
  deleteActivityFromSheet,
} from '@/services/sheetsApi';
import { getCachedActivities, setCachedActivities } from '@/services/cacheService';

// Module-level variables for rate-limiting and deduplication
let lastFetchTime = 0;
let fetchPromise: Promise<Activity[]> | null = null;
const FETCH_COOLDOWN_MS = 60000; // 1 minute

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
  const { isAuthenticated } = useAuth();
  const { startOperation, endOperation, showSyncing, hideSyncing, showCriticalError } = useLoading();

  const [allActivities, setAllActivities] = useState<Activity[]>(getCachedActivities);
  
  // Derived state from allActivities instead of multiple independent states
  const activities = date ? allActivities.filter(a => a.date === date) : [];
  const recentActivities = allActivities.filter(a => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return a.date >= cutoff.toISOString().slice(0, 10);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const syncLocalActivities = useCallback((newAll: Activity[]) => {
    setAllActivities(newAll);
    setCachedActivities(newAll);
  }, []);

  // We fetch all to keep the cache fully populated and in sync,
  // but we do it silently without blocking the UI if cache exists.
  const refetchAll = useCallback(async (force = false) => {
    if (!isAuthenticated) return;

    // Rate limiting: if we already have data and it's been less than the cooldown, don't fetch again
    const now = Date.now();
    if (!force && allActivities.length > 0 && now - lastFetchTime < FETCH_COOLDOWN_MS) {
      return;
    }

    setIsLoading(true);
    // Only show blocking loader if we have absolutely no data
    if (allActivities.length === 0) {
      startOperation('activities', 'Loading today\'s activities...');
    } else {
      showSyncing();
    }
    setError(null);
    try {
      // Deduplication: if a fetch is already in progress, wait for it instead of starting a new one
      if (!fetchPromise) {
        fetchPromise = fetchAllActivities().finally(() => {
          fetchPromise = null;
        });
      }
      const data = await fetchPromise;
      lastFetchTime = Date.now();
      syncLocalActivities(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load activities.';
      setError(msg);
      if (allActivities.length === 0) {
        showCriticalError('Unable to load your activities.');
      }
    } finally {
      setIsLoading(false);
      hideSyncing();
      endOperation('activities');
    }
  }, [isAuthenticated, allActivities.length, syncLocalActivities, startOperation, endOperation, showSyncing, hideSyncing, showCriticalError]);

  const refetchByDate = useCallback(
    async (targetDate: string) => {
      // With our new architecture, if we need data for a date, we just ensure we have the whole sheet synced.
      // We don't fetch just one date anymore because the cache is the source of truth for all components.
      await refetchAll();
    },
    [refetchAll]
  );

  const refetchRecent = useCallback(
    async (days = 30) => {
      await refetchAll();
    },
    [refetchAll]
  );

  const saveActivity = useCallback(
    async (activity: Activity): Promise<boolean> => {
      if (!isAuthenticated) {
        setError('Not authenticated. Please log in again.');
        return false;
      }
      setIsSaving(true);
      setError(null);
      // Optimistic update
      const previousAll = [...allActivities];
      syncLocalActivities([...allActivities, activity]);

      try {
        await appendActivity(activity);
        return true;
      } catch (err) {
        // Rollback
        syncLocalActivities(previousAll);
        setError(err instanceof Error ? err.message : 'Failed to save activity.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, allActivities, syncLocalActivities]
  );

  const updateActivity = useCallback(
    async (activity: Activity): Promise<boolean> => {
      if (!isAuthenticated) return false;
      setIsSaving(true);
      setError(null);
      
      // Optimistic update
      const previousAll = [...allActivities];
      syncLocalActivities(allActivities.map(a => (a.id === activity.id ? activity : a)));

      try {
        await updateActivityInSheet(activity);
        return true;
      } catch (err) {
        // Rollback
        syncLocalActivities(previousAll);
        setError(err instanceof Error ? err.message : 'Failed to update activity.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, allActivities, syncLocalActivities]
  );

  const deleteActivity = useCallback(
    async (activityId: string, createdAt: string): Promise<boolean> => {
      if (!isAuthenticated) return false;
      setIsSaving(true);
      setError(null);
      
      // Optimistic remove
      const previousAll = [...allActivities];
      syncLocalActivities(allActivities.filter(a => a.id !== activityId));

      try {
        await deleteActivityFromSheet(activityId, createdAt);
        return true;
      } catch (err) {
        // Rollback
        syncLocalActivities(previousAll);
        setError(err instanceof Error ? err.message : 'Failed to delete activity.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, allActivities, syncLocalActivities]
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
