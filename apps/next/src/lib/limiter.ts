// Tiny in-memory fixed-window rate limiter (single server process). Server-only.
import 'server-only';

const hits = new Map<string, { n: number; reset: number }>();

/** Returns true when the caller is over the limit. `count` the attempt now (default) or only check (`peek`). */
export function limited(key: string, limit: number, windowMs: number, peek = false) {
  const t = Date.now(), h = hits.get(key);
  if (!h || h.reset < t) { if (!peek) hits.set(key, { n: 1, reset: t + windowMs }); return false; }
  if (h.n >= limit) return true;
  if (!peek) h.n++;
  return false;
}
export const clearLimit = (key: string) => { hits.delete(key); };
setInterval(() => { const t = Date.now(); for (const [k, h] of hits) if (h.reset < t) hits.delete(k); }, 10 * 60 * 1000).unref?.();
