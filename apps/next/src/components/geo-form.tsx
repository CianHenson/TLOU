'use client';
// <GeoForm> is an <ApiForm> that first asks the browser for the device location and posts it as lat / lng / acc.
// Used by Time In: the server compares it with the office location (lib/queries/clock.ts checkOffice).
import type { ReactNode } from 'react';
import { ApiForm } from './form';

const REASONS: Record<number, string> = {
  1: 'Location access is blocked. Allow location for this site in your browser settings, then try again.',
  2: 'Your location could not be determined. Turn on GPS / location services and try again.',
  3: 'Getting your location timed out. Move to an open area or turn on GPS, then try again.',
};

function locate(fd: FormData): Promise<string | void> {
  if (!('geolocation' in navigator)) return Promise.resolve('This device or browser does not support location, so you cannot time in.');
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (p) => { fd.set('lat', String(p.coords.latitude)); fd.set('lng', String(p.coords.longitude)); fd.set('acc', String(p.coords.accuracy)); resolve(); },
    (e) => resolve(REASONS[e.code] || REASONS[2]),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  ));
}

export function GeoForm({ action, children }: { action: string; children: ReactNode }) {
  return <ApiForm action={action} prepare={locate}>{children}</ApiForm>;
}
