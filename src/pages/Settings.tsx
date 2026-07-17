import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { Card, Button, ErrorAlert, DurationPicker } from '@/components/ui';
import { Settings as SettingsIcon, Clock, Timer, Moon, Sun, Save, ArrowLeft, Sparkles, Target } from 'lucide-react';
import { isValidTimeFormat } from '@/utils/validators';

export function SettingsPage() {
  const { settings, updateSetting, isLoading, error } = useSettings();
  const [localSettings, setLocalSettings] = useState({
    defaultDurationMinutes: settings.defaultDurationMinutes,
    minUntrackedGapMinutes: settings.minUntrackedGapMinutes,
    wakeUpTime: settings.wakeUpTime,
    bedtime: settings.bedtime,
    showQuickTips: settings.showQuickTips ?? true,
    positiveGoalMinutes: settings.positiveGoalMinutes ?? 480,
    neutralThresholdMinutes: settings.neutralThresholdMinutes ?? 600,
  });
  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validate
    if (
      typeof localSettings.defaultDurationMinutes !== 'number' ||
      isNaN(localSettings.defaultDurationMinutes) ||
      localSettings.defaultDurationMinutes < 1 ||
      !Number.isInteger(localSettings.defaultDurationMinutes)
    ) {
      setValidationError('Default Activity Duration must be a positive whole number.');
      return;
    }

    if (
      typeof localSettings.minUntrackedGapMinutes !== 'number' ||
      isNaN(localSettings.minUntrackedGapMinutes) ||
      localSettings.minUntrackedGapMinutes < 1 ||
      !Number.isInteger(localSettings.minUntrackedGapMinutes)
    ) {
      setValidationError('Timeline Gap Threshold must be a positive whole number.');
      return;
    }

    if (
      typeof localSettings.positiveGoalMinutes !== 'number' ||
      isNaN(localSettings.positiveGoalMinutes) ||
      localSettings.positiveGoalMinutes < 1 ||
      !Number.isInteger(localSettings.positiveGoalMinutes)
    ) {
      setValidationError('Daily Positive Goal must be a positive whole number.');
      return;
    }

    if (
      typeof localSettings.neutralThresholdMinutes !== 'number' ||
      isNaN(localSettings.neutralThresholdMinutes) ||
      localSettings.neutralThresholdMinutes < 1 ||
      !Number.isInteger(localSettings.neutralThresholdMinutes)
    ) {
      setValidationError('Neutral Activity Threshold must be a positive whole number.');
      return;
    }

    if (!isValidTimeFormat(localSettings.wakeUpTime) || !isValidTimeFormat(localSettings.bedtime)) {
      setValidationError('Please enter valid times for Wake-up Time and Bedtime (HH:mm).');
      return;
    }
    
    setValidationError(null);
    setSaveSuccess(false);

    try {
      if (localSettings.defaultDurationMinutes !== settings.defaultDurationMinutes) {
        await updateSetting('defaultDurationMinutes', localSettings.defaultDurationMinutes);
      }
      if (localSettings.minUntrackedGapMinutes !== settings.minUntrackedGapMinutes) {
        await updateSetting('minUntrackedGapMinutes', localSettings.minUntrackedGapMinutes);
      }
      if (localSettings.wakeUpTime !== settings.wakeUpTime) {
        await updateSetting('wakeUpTime', localSettings.wakeUpTime);
      }
      if (localSettings.bedtime !== settings.bedtime) {
        await updateSetting('bedtime', localSettings.bedtime);
      }
      if (localSettings.showQuickTips !== settings.showQuickTips) {
        await updateSetting('showQuickTips', localSettings.showQuickTips);
      }
      if (localSettings.positiveGoalMinutes !== settings.positiveGoalMinutes) {
        await updateSetting('positiveGoalMinutes', localSettings.positiveGoalMinutes);
      }
      if (localSettings.neutralThresholdMinutes !== settings.neutralThresholdMinutes) {
        await updateSetting('neutralThresholdMinutes', localSettings.neutralThresholdMinutes);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      // Error handled by context
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="p-3 bg-brand-500/20 rounded-xl text-brand-300">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {(error || validationError) && (
        <ErrorAlert error={error || validationError || ''} onDismiss={() => setValidationError(null)} />
      )}

      {/* Activity Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Timer className="w-5 h-5 text-brand-400" />
          Activity Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Default Activity Duration (minutes)</label>
            <p className="text-xs text-slate-500 mb-2">The default length of a new activity when logging.</p>
            <input
              type="number"
              min="1"
              step="1"
              value={localSettings.defaultDurationMinutes || ''}
              onChange={(e) => setLocalSettings(s => ({ ...s, defaultDurationMinutes: parseInt(e.target.value, 10) }))}
              className="w-full sm:w-64 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
            />
          </div>
        </div>
      </Card>

      {/* Timeline Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-brand-400" />
          Timeline Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Timeline Gap Threshold (minutes)</label>
            <p className="text-xs text-slate-500 mb-2">Minimum empty time between activities before a "No Activity Recorded" block is shown.</p>
            <input
              type="number"
              min="1"
              step="1"
              value={localSettings.minUntrackedGapMinutes || ''}
              onChange={(e) => setLocalSettings(s => ({ ...s, minUntrackedGapMinutes: parseInt(e.target.value, 10) }))}
              className="w-full sm:w-64 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
            />
          </div>
        </div>
      </Card>

      {/* Default Sleep Schedule */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Moon className="w-5 h-5 text-brand-400" />
          Default Sleep Schedule
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          This schedule is used globally unless overridden for a specific day. You can customize a specific day's schedule directly from the Statistics page.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Wake-up Time
            </label>
            <input
              type="time"
              value={localSettings.wakeUpTime}
              onChange={(e) => setLocalSettings(s => ({ ...s, wakeUpTime: e.target.value }))}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Moon className="w-4 h-4 text-brand-400" />
              Bedtime
            </label>
            <input
              type="time"
              value={localSettings.bedtime}
              onChange={(e) => setLocalSettings(s => ({ ...s, bedtime: e.target.value }))}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </Card>

      {/* Scoring Goals */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-brand-400" />
          Scoring Goals
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DurationPicker
            label="Daily Positive Goal"
            description="Target amount of Positive activities required each day."
            valueMinutes={localSettings.positiveGoalMinutes}
            onChange={(val) => setLocalSettings(s => ({ ...s, positiveGoalMinutes: val }))}
          />
          <DurationPicker
            label="Neutral Threshold"
            description="Maximum Neutral time before penalties begin."
            valueMinutes={localSettings.neutralThresholdMinutes}
            onChange={(val) => setLocalSettings(s => ({ ...s, neutralThresholdMinutes: val }))}
          />
        </div>
      </Card>

      {/* Quick Tips Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand-400" />
          Quick Tips
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={localSettings.showQuickTips}
              onChange={(e) => setLocalSettings(s => ({ ...s, showQuickTips: e.target.checked }))}
              className="w-5 h-5 rounded border-white/20 bg-black/20 text-brand-500 focus:ring-brand-500/50 outline-none"
            />
            <span className="text-sm font-medium text-slate-300">Show Quick Tips</span>
          </label>
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          isLoading={isLoading}
          leftIcon={!isLoading ? <Save className="w-4 h-4" /> : undefined}
          className="min-w-[140px]"
        >
          {saveSuccess ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
