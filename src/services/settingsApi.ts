import { DEFAULT_SETTINGS, type Settings } from '@/config/settings';

async function handleResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string })?.error ?? `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Fetch settings from backend and merge with defaults.
 */
export async function fetchSettings(): Promise<Settings> {
  const data = (await handleResponse(
    await fetch('/api/sheets/settings')
  )) as { values?: string[][] };

  const values = data.values || [];
  const settingsObj = { ...DEFAULT_SETTINGS } as any;

  for (const row of values) {
    if (row.length === 2) {
      const [key, value] = row;
      if (key in DEFAULT_SETTINGS) {
        // Parse numbers if applicable
        const numValue = Number(value);
        if (!isNaN(numValue) && typeof DEFAULT_SETTINGS[key as keyof Settings] === 'number') {
          settingsObj[key] = numValue;
        } else {
          let finalValue = value;
          if (typeof value === 'string' && value.trim() !== '') {
            // Normalize time settings strictly to HH:mm (Google Sheets may return "8:00 AM" or "8:00:00")
            if (key === 'wakeUpTime' || key === 'bedtime') {
               const matchAMPM = value.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
               if (matchAMPM) {
                 let [_, hStr, mStr, ampm] = matchAMPM;
                 let h = parseInt(hStr, 10);
                 if (ampm) {
                   if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
                   if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
                 }
                 finalValue = `${h.toString().padStart(2, '0')}:${mStr}`;
               }
            }
          }

          // Fallback to default if string is empty or invalid
          settingsObj[key] = (typeof finalValue === 'string' && finalValue.trim() !== '') 
            ? finalValue 
            : DEFAULT_SETTINGS[key as keyof Settings];
        }
      }
    }
  }

  return settingsObj as Settings;
}

/**
 * Sync entire settings object to the backend.
 */
export async function syncSettings(settings: Settings): Promise<void> {
  const values = Object.entries(settings).map(([key, value]) => [key, String(value)]);

  await handleResponse(
    await fetch('/api/sheets/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    })
  );
}
