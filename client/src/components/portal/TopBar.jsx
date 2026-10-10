import { useSyncExternalStore } from 'react';

const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

const SIZES = [
  ['sm', 'A-', 'Decrease text size'],
  ['md', 'A', 'Normal text size'],
  ['lg', 'A+', 'Increase text size'],
];

// One shared text-size setting, so every A- / A / A+ control on screen stays in sync.
let current = read('isip_font', 'md');
if (typeof document !== 'undefined') document.documentElement.dataset.font = current;
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function setFont(value) {
  current = value;
  document.documentElement.dataset.font = value;
  write('isip_font', value);
  listeners.forEach((fn) => fn());
}

/** A- / A / A+ buttons; the choice is applied to <html> and remembered per browser. */
export function TextSize({ className = '', onDark = false }) {
  const font = useSyncExternalStore(subscribe, () => current);
  return (
    <div className={`items-center gap-1 text-sm ${className}`} role="group" aria-label="Text size">
      {SIZES.map(([value, label, title]) => (
        <button
          key={value}
          type="button"
          onClick={() => setFont(value)}
          aria-pressed={font === value}
          title={title}
          className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 font-bold transition ${font === value
            ? (onDark ? 'bg-white text-indigo-900' : 'bg-indigo-800 text-white')
            : (onDark ? 'text-white hover:bg-white/15' : 'text-indigo-900 hover:bg-indigo-50')}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Tricolour strip at the very top of every page, with a keyboard-only skip link. */
export default function TopBar() {
  return (
    <div className="shrink-0">
      <a href="#main-content" className="sr-only rounded bg-white font-semibold text-indigo-900 focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:px-3 focus:py-1 focus:shadow">Skip to main content</a>
      <div className="tricolor h-3" />
    </div>
  );
}
