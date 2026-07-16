import type { Activity } from '@/types';
import { DEFAULT_SETTINGS, type Settings } from '@/config/settings';

const ACTIVITIES_CACHE_KEY = 'dal_activities_cache';
const SETTINGS_CACHE_KEY = 'dal_settings_cache';

/**
 * Retrieves all activities from the local cache.
 */
export function getCachedActivities(): Activity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as Activity[];
    }
  } catch (err) {
    console.error('Failed to read activities cache:', err);
  }
  return [];
}

/**
 * Overwrites the entire activities cache.
 */
export function setCachedActivities(activities: Activity[]): void {
  try {
    localStorage.setItem(ACTIVITIES_CACHE_KEY, JSON.stringify(activities));
  } catch (err) {
    console.error('Failed to write activities cache:', err);
  }
}

/**
 * Retrieves settings from the local cache, merged with defaults.
 */
export function getCachedSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to read settings cache:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Updates the settings cache.
 */
export function setCachedSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to write settings cache:', err);
  }
}
