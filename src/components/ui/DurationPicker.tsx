import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface DurationPickerProps {
  valueMinutes: number;
  onChange: (totalMinutes: number) => void;
  label: string;
  description?: string;
  className?: string;
}

export function DurationPicker({ valueMinutes, onChange, label, description, className }: DurationPickerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Sync from props
  useEffect(() => {
    const h = Math.floor((valueMinutes || 0) / 60);
    const m = (valueMinutes || 0) % 60;
    setHours(h);
    setMinutes(m);
  }, [valueMinutes]);

  const updateParent = (h: number, m: number) => {
    // Handle minute overflow/underflow
    let newH = h;
    let newM = m;
    
    if (newM >= 60) {
      newH += Math.floor(newM / 60);
      newM = newM % 60;
    } else if (newM < 0) {
      if (newH > 0) {
        newH -= 1;
        newM = 60 + newM;
      } else {
        newM = 0;
      }
    }

    if (newH < 0) newH = 0;

    setHours(newH);
    setMinutes(newM);
    onChange(newH * 60 + newM);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) updateParent(val, minutes);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) updateParent(hours, val);
  };

  return (
    <div className={`space-y-3 ${className || ''}`.trim()}>
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1">{label}</label>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hours</span>
          <div className="flex items-center bg-black/20 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/30 transition-all">
            <button
              type="button"
              onClick={() => updateParent(hours - 1, minutes)}
              disabled={hours <= 0}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Decrease hours"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              value={hours.toString()}
              onChange={handleHourChange}
              className="w-12 text-center bg-transparent border-none text-sm font-medium text-white outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => updateParent(hours + 1, minutes)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Increase hours"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Colon separator */}
        <div className="flex items-center pt-5">
          <span className="text-slate-600 font-bold">:</span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Minutes</span>
          <div className="flex items-center bg-black/20 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/30 transition-all">
            <button
              type="button"
              onClick={() => updateParent(hours, minutes - 5)}
              disabled={hours <= 0 && minutes <= 0}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Decrease minutes"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              value={minutes.toString().padStart(2, '0')}
              onChange={handleMinuteChange}
              className="w-12 text-center bg-transparent border-none text-sm font-medium text-white outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => updateParent(hours, minutes + 5)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Increase minutes"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="pt-2">
        <p className="text-xs text-brand-400/80 font-medium">
          Total: {hours > 0 ? `${hours}h ` : ''}{minutes}m <span className="text-slate-500 ml-1">({valueMinutes || 0} mins)</span>
        </p>
      </div>
    </div>
  );
}
