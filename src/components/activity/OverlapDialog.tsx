import React from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Activity } from '@/types';
import { formatTime12h } from '@/utils/timeUtils';

interface OverlapDialogProps {
  isOpen: boolean;
  conflictingActivity: Activity | null;
  proposedActivity: Activity | null;
  onResolveAuto: () => void;
  onResolveKeep: () => void;
  onCancel: () => void;
}

export function OverlapDialog({
  isOpen,
  conflictingActivity,
  proposedActivity,
  onResolveAuto,
  onResolveKeep,
  onCancel,
}: OverlapDialogProps) {
  if (!isOpen || !conflictingActivity || !proposedActivity) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <Card className="w-full max-w-lg p-6 shadow-2xl border-orange-500/30 animate-scale-in bg-[#111118]">
        <div className="flex items-center gap-3 mb-4 text-orange-400">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Time Conflict Detected</h2>
        </div>

        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          This activity overlaps with your previously recorded activity. How would you like to resolve it?
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Previous Activity</span>
              <p className="text-sm font-medium text-slate-200 mt-1">
                {formatTime12h(conflictingActivity.startTime)} → {formatTime12h(conflictingActivity.endTime)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1" dangerouslySetInnerHTML={{ __html: conflictingActivity.description }} />
            </div>
            
            <div className="h-px bg-white/10 w-full" />
            
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">New Activity</span>
              <p className="text-sm font-medium text-orange-300 mt-1">
                {formatTime12h(proposedActivity.startTime)} → {formatTime12h(proposedActivity.endTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResolveAuto}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 transition-colors text-left group"
          >
            <div>
              <p className="text-sm font-bold text-brand-300 mb-1">(Recommended) Adjust Automatically</p>
              <p className="text-xs text-slate-400">Start the new activity 1 minute after the previous one ends, keeping your selected end time.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-brand-400 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>

          <button
            onClick={onResolveKeep}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-bold text-slate-300 mb-1">Keep Current Times</p>
              <p className="text-xs text-slate-400">Allow the overlap and save exactly as entered.</p>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white border-0">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
