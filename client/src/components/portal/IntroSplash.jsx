import { useCallback, useEffect, useState } from 'react';
import { BRAND } from '../../config/brand';

const SEEN_KEY = 'isip_intro_seen';
const REPLAY_EVENT = 'isip:replay-intro';
const FADE_MS = 700;
const MAX_MS = 20000; // never hold visitors longer than this, whatever the animation does

/** Whether to play the intro on its own: once per browser session, never for reduced-motion users or in tests. */
function shouldShow() {
  try {
    if (import.meta.env.MODE === 'test') return false;
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  } catch {
    return false;
  }
}

/** Plays the intro again (used by the small replay button in the masthead). */
export function replayIntro() {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

/**
 * Full-screen animated intro (public/intro.html, drawn in code) shown the first time someone opens the home page
 * in a session, and whenever replayIntro() is called.
 */
export default function IntroSplash({ auto = false }) {
  const [visible, setVisible] = useState(() => auto && shouldShow());
  const [leaving, setLeaving] = useState(false);
  const [run, setRun] = useState(0); // remounts the frame so a replay starts from the beginning

  const finish = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
    setLeaving(true);
    setTimeout(() => setVisible(false), FADE_MS);
  }, []);

  useEffect(() => {
    const onReplay = () => { setLeaving(false); setRun((n) => n + 1); setVisible(true); };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const maxTimer = setTimeout(finish, MAX_MS);
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    const onMessage = (e) => { if (e.origin === window.location.origin && e.data?.type === 'startin-intro-done') finish(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(maxTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
    };
  }, [visible, run, finish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#050d1f] transition-opacity ease-out ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label={`${BRAND.name} intro`}
    >
      <iframe key={run} src="/intro.html?embed" title={`${BRAND.name} intro animation`} className="absolute inset-0 h-full w-full border-0" aria-hidden="true" tabIndex={-1} />
      <button
        type="button"
        onClick={finish}
        aria-label="Skip intro"
        className="absolute right-3 top-3 rounded px-2 py-1 text-[11px] font-medium text-white/40 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:text-white focus-visible:ring-1 focus-visible:ring-white/60"
      >
        Skip
      </button>
    </div>
  );
}
