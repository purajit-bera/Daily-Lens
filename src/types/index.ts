// ============================================================
// Core Domain Types
// ============================================================

export type ActivityCategory = 'Positive' | 'Neutral' | 'Negative';

export interface Activity {
  id: string; // generated client-side (timestamp + random)
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  durationMinutes: number;
  category: ActivityCategory;
  description: string; // HTML from Tiptap
  createdAt: string; // ISO timestamp
}

export interface Gap {
  isGap: true;
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ActivityFormData {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: ActivityCategory;
  description: string;
}

// ============================================================
// Sheet Row (raw string array from Google Sheets)
// ============================================================

export type SheetRow = [
  string, // Date
  string, // Start Time
  string, // End Time
  string, // Duration (min)
  string, // Category
  string, // Activity (description HTML)
  string, // Created At
  string? // ID (optional for backward compatibility)
];

// ============================================================
// User / Auth
// ============================================================

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
  spreadsheetId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// Statistics
// ============================================================

export interface DaySummary {
  totalActivities: number;
  totalMinutes: number;
  positiveMinutes: number;
  neutralMinutes: number;
  negativeMinutes: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  productivityScore: number; // 0-100
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface TrendDataPoint {
  date: string; // MM/DD
  positive: number;
  neutral: number;
  negative: number;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // number of activities
  totalMinutes: number;
}

// ============================================================
// Filter
// ============================================================

export type FilterType = 'All' | ActivityCategory;

// ============================================================
// UI State
// ============================================================

export interface TimeSyncState {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
}

export interface SaveDraft {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: ActivityCategory;
  description: string;
  savedAt: number;
}

// ============================================================
// Theme
// ============================================================

export type Theme = 'dark' | 'light';
