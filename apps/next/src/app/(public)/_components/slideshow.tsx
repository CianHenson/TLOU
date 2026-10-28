'use client';
import { useEffect, useState } from 'react';

// Own photos have no credit and are letterboxed (small crop); the rest are Wikimedia Commons photos, credited under the slideshow.
type Slide = { src: string; name: string; kind: string; credit?: string; own?: boolean };
const SLIDES: Slide[] = [
  { src: '/slides/innova.jpg', name: 'Toyota Innova', kind: 'SUV / MPV rental', credit: 'Nhaidar, CC0' },
  { src: '/slides/dmax.jpg', name: 'Isuzu D-Max', kind: 'Pickup rental', credit: 'LuvsMG481, CC BY-SA 4.0' },
  { src: '/slides/veloz.jpg', name: 'Toyota Veloz', kind: 'SUV / MPV rental', credit: 'Ethan Llamas, CC BY-SA 4.0' },
  { src: '/slides/hiace.jpg', name: 'Toyota HiAce Commuter', kind: 'Van service', own: true },
  { src: '/slides/hilux.jpg', name: 'Toyota Hilux', kind: 'Pickup rental', credit: 'Captainmorlypogi1959, CC BY-SA 4.0' },
  { src: '/slides/mirage.jpg', name: 'Mitsubishi Mirage G4', kind: 'Car rental', credit: 'Ahri.boy, CC BY 4.0' },
  { src: '/slides/avanza.jpg', name: 'Toyota Avanza', kind: 'SUV / MPV rental', credit: 'Ethan Llamas, CC BY-SA 4.0' },
];
const MS = 5000;
const N = SLIDES.length;

/**
 * Auto-advancing image container. Below it, three small clickable bars: previous (left), current (middle, fills over the
 * interval and restarts when the next image appears) and next (right). Clicking previous / next jumps to that image.
 */
export function Slideshow() {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bumps on every change so the middle bar restarts even when re-clicked
  useEffect(() => {
    const t = setTimeout(() => go(i + 1), MS);
    return () => clearTimeout(t);
  }, [i, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (n: number) => { setI((n + N) % N); setRun((r) => r + 1); };
  const cur = SLIDES[i]!;
  return (
    <div className="slideshow" role="region" aria-roledescription="carousel" aria-label="Car rentals and van services">
      <div className="ss-frame">
        {SLIDES.map((s, n) => <img key={s.src} src={s.src} alt={n === i ? `${s.name} — ${s.kind}` : ''} className={`${n === i ? 'on' : ''} ${s.own ? 'own' : ''}`} aria-hidden={n !== i} loading={n === 0 ? 'eager' : 'lazy'} />)}
        <div className="ss-cap"><b>{cur.name}</b><span>{cur.kind}</span></div>
      </div>
      <div className="ss-bars">
        <button type="button" className="ss-seg prev" aria-label="Previous image" onClick={() => go(i - 1)}><span /></button>
        <button type="button" className="ss-seg cur" aria-label="Current image, restart" aria-current="true" onClick={() => go(i)}><span key={run} style={{ animationDuration: `${MS}ms` }} /></button>
        <button type="button" className="ss-seg next" aria-label="Next image" onClick={() => go(i + 1)}><span /></button>
      </div>
      <p className="ss-credit small muted">{cur.credit ? `Photo: ${cur.credit} via Wikimedia Commons. Representative photo of the model we rent.` : 'Photo: Alchemist Trip & Ride Travel Service.'}</p>
    </div>
  );
}
