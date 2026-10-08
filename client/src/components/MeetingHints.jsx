import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

/** Small status line under a confirmed meeting: checked in / check-in open / opens at. */
export function CheckInHint({ checkedInAt, timing }) {
  if (checkedInAt) {
    return <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Checked in · meeting in progress</p>;
  }
  if (timing.checkInOpen) {
    return <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Check-in open: auto-cancels at {timing.deadlineAt} if no one checks in</p>;
  }
  if (timing.isToday && timing.beforeCheckIn) {
    return <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />Check-in opens at {timing.opensAt}</p>;
  }
  return null;
}

/** Hint under an unconfirmed request on the day it's due. */
export function ExpiryHint({ timing }) {
  if (!timing.isToday) return null;
  return <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Expires at {timing.deadlineAt} if not confirmed</p>;
}
