'use client';
// Scrolls the pulsing row (#hl-row, set by ?hl=YYYY-MM-DD) into view when My Attendance opens from the dashboard calendar.
import { useEffect } from 'react';

export function HighlightScroll() {
  useEffect(() => { document.getElementById('hl-row')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, []);
  return null;
}
