'use client';
// Small client-side behaviours that were data-* attributes in the old app.js.
import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';

/** window.print() */
export function PrintButton({ children = 'Print', className = 'btn ghost sm' }: { children?: ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={() => window.print()}>{children}</button>;
}

/** Philippine-time clock, offset from the server time so a wrong PC clock cannot mislead (display only). */
export function Clock({ now, split = false }: { now: string; split?: boolean }) {
  const [text, setText] = useState(now);
  useEffect(() => {
    const off = Date.parse(now.replace(' ', 'T') + '+08:00') - Date.now();
    const fmt = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const tick = () => setText(fmt.format(new Date(Date.now() + off)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [now]);
  if (!split) return <div className="clock" suppressHydrationWarning>{text}</div>;
  // "Monday, October 26, 2026 at 2:43:31 PM" -> big time + small date
  const [d, t] = text.split(/ at /);
  return <div suppressHydrationWarning><div className="clock-time">{t ?? text}</div>{t && <div className="clock-date">{d}</div>}</div>;
}

/** <select> inside a GET filter form that submits the form when changed. */
export function AutoSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => { props.onChange?.(e); e.currentTarget.form?.requestSubmit(); }} />;
}

/** Mobile sidebar toggle (the sidebar is `.side`; the button just flips its `open` class). */
export function MenuButton() {
  return <button type="button" className="btn ghost sm menu" aria-label="Menu" onClick={() => document.querySelector('.side')?.classList.toggle('open')}>☰ Menu</button>;
}

/** Highlights the public nav link of the home-page section currently in view. */
export function useScrollSpy(ids: string[]) {
  const [on, setOn] = useState('');
  const seen = useRef(new Map<string, boolean>());
  useEffect(() => {
    const secs = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!secs.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => seen.current.set(e.target.id, e.isIntersecting));
      const cur = secs.filter((s) => seen.current.get(s.id)).pop();
      if (cur) setOn(cur.id);
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);
  return on;
}
