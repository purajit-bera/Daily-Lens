import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Calendar, Clock, Timer, Save, Zap } from 'lucide-react';
import type { Activity, ActivityCategory, ActivityFormData } from '@/types';
import { useTimeSync } from '@/hooks/useTimeSync';
import { useSettings } from '@/context/SettingsContext';
import { RichTextEditor } from './RichTextEditor';
import { Button, Card, ErrorAlert, cn } from '@/components/ui';
import { todayDate, generateId, formatTime12h, currentTime, calcStartTime, calcEndTime, formatDurationLong } from '@/utils/timeUtils';
import { validateActivity } from '@/utils/validators';

const DRAFT_KEY = 'dal_draft';
const RECENT_KEY = 'dal_recent_activities';
const MAX_RECENT = 5;

interface ActivityFormProps {
  onSave: (activity: Activity) => Promise<boolean>;
  isSaving: boolean;
  initialData?: Activity;
}

const CATEGORIES: { value: ActivityCategory; label: string; emoji: string; color: string }[] = [
  { value: 'Positive', label: 'Positive', emoji: '🟢', color: 'text-slate-400 bg-white/5 hover:bg-white/10' },
  { value: 'Neutral',  label: 'Neutral',  emoji: '⚪', color: 'text-slate-400 bg-white/5 hover:bg-white/10' },
  { value: 'Negative', label: 'Negative', emoji: '🔴', color: 'text-slate-400 bg-white/5 hover:bg-white/10' },
];

const ACTIVE_CATEGORY_CLASSES: Record<ActivityCategory, string> = {
  Positive: 'bg-green-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.25)]',
  Neutral:  'bg-slate-600 text-white shadow-[0_4px_12px_rgba(71,85,105,0.25)]',
  Negative: 'bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)]',
};

export function ActivityForm({ onSave, isSaving, initialData }: ActivityFormProps) {
  const { settings } = useSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const descRef = useRef<string>('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ActivityFormData>({
    defaultValues: initialData ? {
      date: initialData.date,
      category: initialData.category,
      description: initialData.description,
    } : {
      date: todayDate(settings.wakeUpTime),
      category: 'Positive',
      description: '',
    },
  });

  const date = watch('date');
  const timeSync = useTimeSync(date, initialData ? {
    startTime: initialData.startTime,
    endTime: initialData.endTime,
    durationMinutes: initialData.durationMinutes,
  } : undefined, settings.wakeUpTime);
  const description = watch('description');
  const category = watch('category');

  const [durationStr, setDurationStr] = useState(timeSync.durationMinutes.toString());
  useEffect(() => {
    setDurationStr(timeSync.durationMinutes.toString());
  }, [timeSync.durationMinutes]);

  // Keep descRef in sync for draft saving
  useEffect(() => { descRef.current = description; }, [description]);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ActivityFormData>;
        if (draft.date) setValue('date', draft.date);
        if (draft.category) setValue('category', draft.category);
        if (draft.description) setValue('description', draft.description);
        if (draft.startTime) timeSync.setAll({ startTime: draft.startTime });
        if (draft.endTime && draft.durationMinutes) {
          timeSync.setAll({ endTime: draft.endTime, durationMinutes: draft.durationMinutes });
        }
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentActivities(JSON.parse(raw));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft every 2s
  useEffect(() => {
    const timer = setInterval(() => {
      const draft: Partial<ActivityFormData> = {
        date: watch('date'),
        category: watch('category'),
        description: descRef.current,
        startTime: timeSync.startTime,
        endTime: timeSync.endTime,
        durationMinutes: timeSync.durationMinutes,
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 2000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSync.startTime, timeSync.endTime, timeSync.durationMinutes]);

  const handleSave = useCallback(
    async (data: ActivityFormData) => {
      const payload: ActivityFormData = {
        ...data,
        startTime: timeSync.startTime,
        endTime: timeSync.endTime,
        durationMinutes: timeSync.durationMinutes,
      };

      const validationErrors = validateActivity(payload);
      if (validationErrors.length > 0) {
        setSubmitError(validationErrors[0].message);
        return;
      }

      setSubmitError(null);

      const activity: Activity = {
        id: initialData?.id || generateId(),
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        durationMinutes: payload.durationMinutes,
        category: payload.category,
        description: payload.description,
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      const success = await onSave(activity);

      if (success) {
        // Save to recent activities
        const stripped = payload.description.replace(/<[^>]*>/g, '').trim().slice(0, 80);
        if (stripped) {
          const updated = [stripped, ...recentActivities.filter(r => r !== stripped)].slice(0, MAX_RECENT);
          setRecentActivities(updated);
          localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        }

        // Only clear if we are not editing
        if (!initialData) {
          reset({
            date: payload.date,
            category: 'Positive',
            description: '',
          });
          timeSync.reset();
        }
        sessionStorage.removeItem(DRAFT_KEY);
      }
    },
    [timeSync, onSave, recentActivities, setValue, initialData]
  );

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(handleSave)}
      className="space-y-6"
      noValidate
    >
      {submitError && (
        <ErrorAlert error={submitError} onDismiss={() => setSubmitError(null)} />
      )}

      {/* Date + Time Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <Card className="p-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <Calendar className="w-3.5 h-3.5" />
            Date
          </label>
          <input
            id="activity-date"
            type="date"
            {...register('date', { required: 'Date is required' })}
            className={cn(
              'w-full bg-transparent text-white text-sm rounded-xl px-3 py-2',
              'border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30',
              'outline-none transition-all duration-250',
              'dark:[color-scheme:dark]',
              errors.date && 'border-red-500/50'
            )}
          />
          {errors.date && (
            <p className="text-xs text-red-400 mt-1">{errors.date.message}</p>
          )}
        </Card>

        {/* Time fields */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Time
            </label>
            <button
              type="button"
              onClick={() => {
                timeSync.reset();
                setDurationStr('60');
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Reset Time
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Start Time */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start</label>
              <input
                id="start-time"
                type="time"
                max={date === todayDate(settings.wakeUpTime) ? currentTime() : undefined}
                value={timeSync.startTime}
                onChange={e => {
                  let val = e.target.value;
                  if (date === todayDate(settings.wakeUpTime) && val > currentTime()) {
                    val = currentTime();
                    timeSync.setAll({
                      startTime: val,
                      endTime: calcEndTime(val, timeSync.durationMinutes),
                      durationMinutes: timeSync.durationMinutes
                    });
                  } else {
                    timeSync.setStartTime(val);
                  }
                }}
                className={cn(
                  'w-full bg-transparent text-white text-xs rounded-xl px-2 py-2',
                  'border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30',
                  'outline-none transition-all duration-250 dark:[color-scheme:dark]'
                )}
              />
            </div>

            {/* End Time */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End</label>
              <input
                id="end-time"
                type="time"
                max={date === todayDate(settings.wakeUpTime) ? currentTime() : undefined}
                value={timeSync.endTime}
                onChange={e => {
                  let val = e.target.value;
                  if (date === todayDate(settings.wakeUpTime) && val > currentTime()) {
                    val = currentTime();
                    timeSync.setAll({
                      endTime: val,
                      startTime: calcStartTime(val, timeSync.durationMinutes),
                      durationMinutes: timeSync.durationMinutes
                    });
                  } else {
                    timeSync.setEndTime(val);
                  }
                }}
                className={cn(
                  'w-full bg-transparent text-white text-xs rounded-xl px-2 py-2',
                  'border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30',
                  'outline-none transition-all duration-250 dark:[color-scheme:dark]'
                )}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                <Timer className="w-3 h-3" />
                Min
              </label>
              <input
                id="duration-minutes"
                type="number"
                min={1}
                max={1440}
                value={durationStr}
                onChange={e => {
                  setDurationStr(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  if (!isNaN(parsed) && parsed > 0) {
                    timeSync.setDuration(parsed);
                  }
                }}
                onBlur={() => {
                  const parsed = parseInt(durationStr, 10);
                  if (isNaN(parsed) || parsed <= 0) {
                    setDurationStr('60');
                    timeSync.setDuration(60);
                  } else {
                    setDurationStr(parsed.toString());
                  }
                }}
                className={cn(
                  'w-full bg-transparent text-white text-xs rounded-xl px-2 py-2',
                  'border border-white/10 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30',
                  'outline-none transition-all duration-250'
                )}
              />
            </div>
          </div>

          {/* Time display */}
          <p className="mt-2 text-xs text-slate-500 text-center font-medium tracking-wide">
            {formatTime12h(timeSync.startTime)} <span className="text-slate-600 mx-1">→</span> {formatTime12h(timeSync.endTime)} <span className="text-slate-600 mx-1">•</span> {formatDurationLong(timeSync.durationMinutes)}
          </p>
        </Card>
      </div>

      {/* Category */}
      <Card className="p-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          <Zap className="w-3.5 h-3.5" />
          Activity Type
        </label>
        <Controller
          name="category"
          control={control}
          rules={{ required: 'Please select a category' }}
          render={({ field }) => (
            <div
              id="category-selector"
              className="grid grid-cols-3 gap-3"
              role="group"
              aria-label="Activity category"
            >
              {CATEGORIES.map(({ value, label, emoji, color }) => {
                const isActive = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    id={`category-${value.toLowerCase()}`}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-3 px-3 rounded-xl font-medium',
                      'transition-all duration-250 active:scale-95',
                      isActive ? ACTIVE_CATEGORY_CLASSES[value] : color
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.category && (
          <p className="text-xs text-red-400 mt-2">{errors.category.message}</p>
        )}
      </Card>

      {/* Description */}
      <Card className="p-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Activity Description
          <span className="hidden md:inline ml-auto text-slate-600 font-normal normal-case tracking-normal text-xs">
            Ctrl+Enter to save
          </span>
        </label>

        {/* Recent activities */}
        {recentActivities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {recentActivities.map((text, i) => (
              <button
                key={i}
                type="button"
                id={`recent-activity-${i}`}
                onClick={() => setValue('description', `<p>${text}</p>`)}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 max-w-[200px] truncate"
                title={text}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        <Controller
          name="description"
          control={control}
          rules={{ required: 'Description is required' }}
          render={({ field }) => (
            <RichTextEditor
              id="activity-description"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.description && (
          <p className="text-xs text-red-400 mt-2">{errors.description.message}</p>
        )}
      </Card>

      {/* Save Button */}
      <Button
        type="submit"
        id="save-activity-btn"
        variant="primary"
        size="lg"
        isLoading={isSaving}
        leftIcon={<Save className="w-5 h-5" />}
        className="w-full"
      >
        {isSaving ? 'Saving to Google Sheets…' : initialData ? 'Save Changes' : 'Save Activity'}
      </Button>

      <p className="hidden md:block text-center text-xs text-slate-600">
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-xs">Ctrl</kbd>
        {' + '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-xs">Enter</kbd>
        {' '}to save quickly
      </p>
    </form>
  );
}
