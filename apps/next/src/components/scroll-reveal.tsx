'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** What fades in on the public pages: hero text and box, each section's blocks, and grid / card items one by one. */
const TARGETS = [
  '.hero .wrap > div > *', '.hero .glass',
  'main section:not(.hero) .wrap > *:not(.svc2-grid):not(.cards):not(.grid)',
  'main section:not(.hero) :is(.svc2-grid, .cards, .grid) > *',
].join(',');

/**
 * Scroll animation for the public site: each target fades and slides up the first time it enters the screen; items
 * in the same row or grid follow each other with a short stagger. The hiding class is only added by this script, so
 * the page stays fully visible without JavaScript; reduced-motion users get no animation (see theme.css).
 */
export function ScrollReveal() {
  const path = usePathname();
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(TARGETS)].filter((el) => !el.classList.contains('in'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (const el of els) {
      const i = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.setProperty('--rv-d', `${Math.min(i, 6) * 80}ms`);
      el.classList.add('reveal');
      io.observe(el);
    }
    return () => io.disconnect();
  }, [path]);
  return null;
}
