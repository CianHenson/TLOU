'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Customer photo viewer (landscape and portrait mixed). Each photo is shown whole over a blurred copy of itself, so
 * either shape fills the frame without cropping.
 * Mouse: click the right half for the next photo, the left half for the previous one (same as the rental slideshow).
 * Touch (phones / tablets): swipe left for next, right for previous; taps do nothing. Keyboard: ← / →.
 * Advances on its own every 5 s; any click, swipe or key restarts the wait.
 */
export function CustomerGallery({ photos }: { photos: string[] }) {
  if (!photos.length) return (
    <div className="cg">
      <div className="cg-frame cg-empty" role="img" aria-label="Customer photos coming soon">
        <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" />
        </svg>
        <b>Customer photos coming soon</b>
        <span>Snapshots from our travelers will appear here.</span>
      </div>
    </div>
  );
  return <Gallery photos={photos} />;
}

const MS = 3000;

/** Auto-advances every MS, with the same three-bar control as the rental slideshow (previous / current, filling / next). */
function Gallery({ photos }: { photos: string[] }) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bumps on every change so the middle bar and the timer restart even when re-clicked
  const N = photos.length;
  const go = (n: number) => { setI(((n % N) + N) % N); setRun((r) => r + 1); };
  const touch = useRef<{ x: number; y: number } | null>(null);
  const src = photos[i]!;

  useEffect(() => {
    if (N < 2) return;
    const t = setTimeout(() => go(i + 1), MS);
    return () => clearTimeout(t);
  }, [i, run, N]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm the cache for the neighbours so the next / previous photo appears without a blank moment.
  useEffect(() => {
    for (const n of [i + 1, i - 1]) { const img = new Image(); img.src = photos[((n % N) + N) % N]!; }
  }, [i, N, photos]);

  return (
    <div className="cg" role="region" aria-roledescription="carousel" aria-label="Photos of our customers">
      <div
        className="cg-frame" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1); }}
        onClick={(e) => {
          if ((e.nativeEvent as PointerEvent).pointerType && (e.nativeEvent as PointerEvent).pointerType !== 'mouse') return; // touch taps: swipe only
          const r = e.currentTarget.getBoundingClientRect();
          go(e.clientX - r.left < r.width / 2 ? i - 1 : i + 1);
        }}
        onTouchStart={(e) => { const t = e.touches[0]!; touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(e) => {
          const s = touch.current, t = e.changedTouches[0]!;
          touch.current = null;
          if (!s) return;
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? i + 1 : i - 1);
        }}
      >
        <div className="cg-backdrop" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" />
        <img key={src} src={src} alt={`Customer photo ${i + 1} of ${N}`} className="cg-img" draggable={false} />
        <span className="cg-half left" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></span></span>
        <span className="cg-half right" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span></span>
        <span className="cg-count" aria-live="polite">{i + 1} / {N}</span>
      </div>
      {N > 1 && (
        <div className="ss-bars">
          <button type="button" className="ss-seg prev" aria-label="Previous photo" onClick={() => go(i - 1)}><span /></button>
          <button type="button" className="ss-seg cur" aria-label="Current photo, restart" aria-current="true" onClick={() => go(i)}><span key={run} style={{ animationDuration: `${MS}ms` }} /></button>
          <button type="button" className="ss-seg next" aria-label="Next photo" onClick={() => go(i + 1)}><span /></button>
        </div>
      )}
      <p className="cg-hint small muted">
        <span className="cg-hint-mouse">Click the right side for the next photo, the left side for the previous one.</span>
        <span className="cg-hint-touch">Swipe to see more photos.</span>
      </p>
    </div>
  );
}
