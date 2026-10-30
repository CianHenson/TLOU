'use client';
import { useEffect, useRef, useState } from 'react';

// Studio cut-outs on white, shown whole (not cropped) on a white frame.
type Slide = { src: string; name: string; kind: string };
const SLIDES: Slide[] = [
  { src: '/slides/innova.png', name: 'Toyota Innova', kind: 'SUV / MPV rental' },
  { src: '/slides/dmax.webp', name: 'Isuzu D-Max', kind: 'Pickup rental' },
  { src: '/slides/veloz.webp', name: 'Toyota Veloz', kind: 'SUV / MPV rental' },
  { src: '/slides/hiace.webp', name: 'Toyota HiAce Commuter', kind: 'Van service' },
  { src: '/slides/hilux.png', name: 'Toyota Hilux', kind: 'Pickup rental' },
  { src: '/slides/mirage.webp', name: 'Mitsubishi Mirage G4', kind: 'Car rental' },
];
const MS = 5000;
const N = SLIDES.length;

/**
 * Auto-advancing image container. Below it, three small clickable bars: previous (left), current (middle, fills over the
 * interval and restarts when the next image appears) and next (right). Clicking previous / next jumps to that image.
 * The photo itself: mouse click on the right half = next, left half = previous; touch swipe left = next, right = previous.
 */
export function Slideshow() {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bumps on every change so the middle bar restarts even when re-clicked
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => go(i + 1), MS);
    return () => clearTimeout(t);
  }, [i, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (n: number) => { setI((n + N) % N); setRun((r) => r + 1); };
  const cur = SLIDES[i]!;
  return (
    <div className="slideshow" role="region" aria-roledescription="carousel" aria-label="Car rentals and van services">
      <div
        className="ss-frame" tabIndex={0}
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
        {SLIDES.map((s, n) => <img key={s.src} src={s.src} alt={n === i ? `${s.name} — ${s.kind}` : ''} className={n === i ? 'on' : ''} aria-hidden={n !== i} loading={n === 0 ? 'eager' : 'lazy'} draggable={false} />)}
        <span className="cg-half left" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></span></span>
        <span className="cg-half right" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span></span>
      </div>
      <div className="ss-cap" aria-live="polite"><b>{cur.name}</b><span>{cur.kind}</span></div>
      <div className="ss-bars">
        <button type="button" className="ss-seg prev" aria-label="Previous image" onClick={() => go(i - 1)}><span /></button>
        <button type="button" className="ss-seg cur" aria-label="Current image, restart" aria-current="true" onClick={() => go(i)}><span key={run} style={{ animationDuration: `${MS}ms` }} /></button>
        <button type="button" className="ss-seg next" aria-label="Next image" onClick={() => go(i + 1)}><span /></button>
      </div>
      <p className="ss-credit small muted">Representative photos of the models we rent.</p>
    </div>
  );
}
