import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from '../../config/brand';

const SEEN_KEY = 'isip_intro_seen';
const FADE_MS = 700;
const MAX_MS = 12000; // never hold visitors longer than this, whatever the video does

/** Whether to play the intro: once per browser session, never for reduced-motion users or in tests. */
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

/** Full-screen intro video shown the first time someone opens the public site in a session. */
export default function IntroSplash() {
  const [visible, setVisible] = useState(shouldShow);
  const [leaving, setLeaving] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const skipRef = useRef(null);

  const finish = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
    setLeaving(true);
    setTimeout(() => setVisible(false), FADE_MS);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skipRef.current?.focus();
    const brandTimer = setTimeout(() => setShowBrand(true), 1800);
    const maxTimer = setTimeout(finish, MAX_MS);
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    // Autoplay can be blocked (data saver, some browsers); if so, don't keep visitors waiting.
    const played = videoRef.current?.play?.();
    if (played && typeof played.catch === 'function') played.catch(finish);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(brandTimer);
      clearTimeout(maxTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, finish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0a1b38] transition-opacity ease-out ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label={`${BRAND.name} intro`}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/intro.mp4"
        poster="/intro-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={finish}
        onError={finish}
        onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1b38] via-[#0a1b38]/70 to-transparent" />

      <div className={`absolute inset-x-0 bottom-16 flex flex-col items-center px-6 text-center transition-all duration-1000 ${showBrand ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <img src="/logo-192.png" alt="" className="h-16 w-16 rounded-2xl bg-white p-1 shadow-lg shadow-cyan-500/20" />
        <p className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{BRAND.name}</p>
        <p className="mt-2 max-w-md text-sm text-indigo-100 sm:text-base">{BRAND.fullName}</p>
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={finish}
        className="absolute bottom-5 right-5 rounded-full border border-white/30 bg-[#0a1b38]/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Skip intro
      </button>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-200 ease-linear" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
