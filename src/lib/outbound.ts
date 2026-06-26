/**
 * Shared plumbing for outbound third-party GETs. Two guards sit on top of
 * Next's durable `revalidate` fetch cache:
 *
 *   1. a per-instance in-memory memo (TTL) so repeat lookups skip the fetch
 *      entirely, and
 *   2. a multi-window call budget (circuit breaker) that is only charged on a
 *      true memo miss — so it caps roughly the number of *upstream* calls, not
 *      cache hits.
 *
 * Best-effort on serverless: the memo and counters are per-instance and reset
 * on cold start; the durable, cross-instance layer is Next's `revalidate`. A
 * global hard ceiling would need a shared store (e.g. Vercel KV).
 *
 * Callers can opt out of the durable layer with `cache: "no-store"` when
 * first-load freshness matters more than cross-instance reuse — the forecast does
 * this so a visit after an idle gap never gets a stale-while-revalidate snapshot;
 * the per-instance memo then becomes the (hard-TTL, synchronous) freshness guard.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export interface RateWindow {
  /** Max upstream calls allowed within the window. */
  limit: number;
  /** Window length, ms. */
  windowMs: number;
}

/**
 * A fixed-window budget across one or more windows (e.g. per-minute *and*
 * per-hour). Returns `false` — without charging any window — if any window is
 * already spent.
 */
export function createLimiter(windows: RateWindow[]): () => boolean {
  const state = windows.map((w) => ({ ...w, start: Date.now(), count: 0 }));
  return () => {
    const now = Date.now();
    for (const s of state) {
      if (now - s.start >= s.windowMs) {
        s.start = now;
        s.count = 0;
      }
    }
    if (state.some((s) => s.count >= s.limit)) return false;
    for (const s of state) s.count += 1;
    return true;
  };
}

interface CachedFetchOptions<T> {
  /** Memo key — usually the request URL. */
  key: string;
  url: string;
  /** Next durable cache window, seconds. Required unless {@link cache} is set. */
  revalidate?: number;
  /** Per-instance memo TTL, ms. */
  memoTtlMs: number;
  /** Circuit breaker (see {@link createLimiter}). */
  limiter: () => boolean;
  /** Map the parsed JSON into the value to cache and return. */
  transform: (json: unknown) => T;
  /**
   * Per-call fetch cache mode. Default (unset) uses Next's durable, cross-instance
   * `revalidate` cache. Pass `"no-store"` to bypass it so a memo miss always hits
   * the network — the per-instance memo + limiter still apply, but the data is
   * never served stale-while-revalidate. Use it where first-load freshness matters
   * more than cross-instance reuse (the forecast); keep the durable cache for
   * slow-moving data (geocoding).
   */
  cache?: RequestCache;
}

const memo = new Map<string, { value: unknown; expires: number }>();
const MAX_MEMO = 1000;

// Bound memory: when the memo grows large, drop everything already expired.
function prune(now: number): void {
  if (memo.size < MAX_MEMO) return;
  for (const [k, entry] of memo) {
    if (entry.expires <= now) memo.delete(k);
  }
}

/**
 * Cached, budgeted JSON GET. Returns the transformed value, or `null` when the
 * call budget is spent (the caller decides how to degrade). Throws on network
 * errors and non-2xx responses.
 */
export async function cachedFetch<T>(opts: CachedFetchOptions<T>): Promise<T | null> {
  const now = Date.now();
  const hit = memo.get(opts.key);
  if (hit && hit.expires > now) return hit.value as T;

  if (!opts.limiter()) return null;

  // `cache: "no-store"` and `next.revalidate` are mutually exclusive in Next, so
  // pick one: the durable revalidate cache by default, or a plain network fetch
  // when the caller opts out (the memo above still collapses repeats).
  const init: RequestInit = opts.cache
    ? { cache: opts.cache }
    : { next: { revalidate: opts.revalidate } };
  const res = await fetch(opts.url, init);
  if (!res.ok) throw new Error(`Upstream request failed (${res.status})`);

  const value = opts.transform(await res.json());
  prune(now);
  memo.set(opts.key, { value, expires: now + opts.memoTtlMs });
  return value;
}
