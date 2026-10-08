import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { BRAND } from '../../config/brand';

const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

/** Applies the saved text-size preference to <html>. */
function useAccessibility() {
  const [font, setFont] = useState(() => read('isip_font', 'md'));
  useEffect(() => {
    document.documentElement.dataset.font = font;
    write('isip_font', font);
  }, [font]);
  return { font, setFont };
}

/** Tricolour strip + utility bar (help desk, text size) shown on every page. */
export default function TopBar() {
  const { font, setFont } = useAccessibility();
  const sizeBtn = (value, label, title) => (
    <button
      type="button"
      onClick={() => setFont(value)}
      aria-pressed={font === value}
      title={title}
      className={`rounded px-1.5 py-0.5 font-semibold transition ${font === value ? 'bg-white text-indigo-900' : 'text-indigo-100 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="shrink-0">
      <div className="tricolor h-1" />
      <div className="bg-indigo-950 text-[12px] text-indigo-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 lg:px-8">
          <div className="flex items-center gap-3">
            <a href="#main-content" className="sr-only rounded bg-white font-semibold text-indigo-900 focus:not-sr-only focus:px-2 focus:py-0.5">Skip to main content</a>
            <a href={`mailto:${BRAND.helpdesk}`} className="inline-flex items-center gap-1 hover:text-white"><Mail className="h-3.5 w-3.5" />{BRAND.helpdesk}</a>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Accessibility options">
            <span className="hidden text-indigo-300 sm:inline">Text size</span>
            {sizeBtn('sm', 'A-', 'Decrease text size')}
            {sizeBtn('md', 'A', 'Normal text size')}
            {sizeBtn('lg', 'A+', 'Increase text size')}
          </div>
        </div>
      </div>
    </div>
  );
}
