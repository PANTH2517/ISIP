import { useEffect, useState } from 'react';
import { Contrast, Mail } from 'lucide-react';
import { BRAND } from '../../config/brand';

const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

/** Applies the saved accessibility preferences to <html> (text size + high contrast). */
function useAccessibility() {
  const [font, setFont] = useState(() => read('isip_font', 'md'));
  const [contrast, setContrast] = useState(() => read('isip_contrast', 'off') === 'on');
  useEffect(() => {
    document.documentElement.dataset.font = font;
    write('isip_font', font);
  }, [font]);
  useEffect(() => {
    document.documentElement.classList.toggle('hc', contrast);
    write('isip_contrast', contrast ? 'on' : 'off');
  }, [contrast]);
  return { font, setFont, contrast, setContrast };
}

/** Tricolour strip + accessibility utility bar shown on every page. */
export default function TopBar() {
  const { font, setFont, contrast, setContrast } = useAccessibility();
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
            <a href="#main-content" className="font-medium hover:text-white hover:underline">Skip to main content</a>
            <span className="hidden text-indigo-400 sm:inline">|</span>
            <a href={`mailto:${BRAND.helpdesk}`} className="hidden items-center gap-1 hover:text-white sm:inline-flex"><Mail className="h-3.5 w-3.5" />{BRAND.helpdesk}</a>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Accessibility options">
            <span className="hidden text-indigo-300 sm:inline">Text size</span>
            {sizeBtn('sm', 'A-', 'Decrease text size')}
            {sizeBtn('md', 'A', 'Normal text size')}
            {sizeBtn('lg', 'A+', 'Increase text size')}
            <span className="text-indigo-400">|</span>
            <button
              type="button"
              onClick={() => setContrast(!contrast)}
              aria-pressed={contrast}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold transition ${contrast ? 'bg-saffron-500 text-white' : 'hover:bg-white/10'}`}
            >
              <Contrast className="h-3.5 w-3.5" /> High contrast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
