import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

export function QuickTips() {
  const { settings } = useSettings();

  if (!settings.showQuickTips) {
    return null;
  }

  // Future Enhancements:
  // - Rotating helpful tips automatically.
  // - Displaying different tips based on where the user is in the application.
  // - Displaying productivity suggestions.
  // - Displaying onboarding tips for new users.
  // - Displaying advanced shortcuts for experienced users.
  
  return (
    <div className="flex items-start gap-2 mt-4 px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
      <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-indigo-200">
        <strong>Quick tip:</strong> End time is <em>now</em>, Start time is when the activity began.
        <span className="hidden md:inline"> Press <kbd className="px-1 py-0.5 rounded bg-indigo-500/20 font-mono">Ctrl+Enter</kbd> to save instantly.</span>
      </p>
    </div>
  );
}
