import type { ActivityFormData } from '@/types';

export interface ValidationError {
  field: keyof ActivityFormData | 'general';
  message: string;
}

export function validateActivity(data: ActivityFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Date
  if (!data.date) {
    errors.push({ field: 'date', message: 'Date is required.' });
  }

  // Times
  if (!data.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required.' });
  }
  if (!data.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required.' });
  }

  // Duration
  if (!data.durationMinutes || data.durationMinutes <= 0) {
    errors.push({ field: 'durationMinutes', message: 'Duration must be greater than 0 minutes.' });
  }
  if (data.durationMinutes > 1440) {
    errors.push({ field: 'durationMinutes', message: 'Duration cannot exceed 24 hours (1440 minutes).' });
  }

  // Category
  if (!data.category || !['Positive', 'Neutral', 'Negative'].includes(data.category)) {
    errors.push({ field: 'category', message: 'Please select a category.' });
  }

  // Description
  const stripped = stripHtml(data.description).trim();
  if (!stripped) {
    errors.push({ field: 'description', message: 'Activity description is required.' });
  }
  if (stripped.length > 5000) {
    errors.push({ field: 'description', message: 'Description is too long (max 5000 characters).' });
  }

  return errors;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}
