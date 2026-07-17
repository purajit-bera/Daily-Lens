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

export interface SleepOverride {
  wakeUpTime: string;
  bedtime: string;
}

export async function fetchOverrides(): Promise<Record<string, SleepOverride>> {
  const data = (await handleResponse(
    await fetch('/api/sheets/overrides')
  )) as Record<string, SleepOverride>;

  // Normalize time settings strictly to HH:mm
  for (const date in data) {
    const override = data[date];
    for (const key of ['wakeUpTime', 'bedtime'] as const) {
      const value = override[key];
      if (typeof value === 'string' && value.trim() !== '') {
        const matchAMPM = value.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
        if (matchAMPM) {
          let [_, hStr, mStr, ampm] = matchAMPM;
          let h = parseInt(hStr, 10);
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
            if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
          }
          override[key] = `${h.toString().padStart(2, '0')}:${mStr}`;
        }
      }
    }
  }

  return data;
}

export async function syncOverrides(overrides: Record<string, SleepOverride>): Promise<void> {
  await handleResponse(
    await fetch('/api/sheets/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    })
  );
}
