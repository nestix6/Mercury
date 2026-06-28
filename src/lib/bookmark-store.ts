/**
 * Persistence for bookmarks (saved locations).
 *
 * Unlike the remembered-location / unit preferences (which live in cookies so
 * the Server Component can seed the first paint — see `location-store.ts` and
 * `units.ts`), bookmarks live in **localStorage**. They're a client-side list of
 * navigation shortcuts that never influence the server-rendered forecast, so
 * there's no first-paint flash to avoid — and a growing list shouldn't ride
 * along on every request. A plain module (the `useBookmarks` hook wraps the
 * state); both read/write guard `window`/`localStorage` so they're inert on the
 * server.
 *
 * A bookmark stores only a place's identity (coords + label) — never weather
 * data, which would go stale. The shape is the same `StoredPlace` the remembered
 * location uses, so the navigation path (`/weather?lat&lon&name&region`) speaks
 * it directly.
 */

import type { StoredPlace } from "@/lib/location-store";

export const BOOKMARKS_KEY = "mercury-bookmarks";

/** Stable identity for a place — rounded coords, matching the app's 3 dp grid. */
export function placeKey(place: StoredPlace): string {
  return `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;
}

/** Validate one entry with the same guards as `parsePlace` (see location-store). */
function isValidPlace(raw: unknown): raw is StoredPlace {
  if (!raw || typeof raw !== "object") return false;
  const { lat, lon, name, region } = raw as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    typeof name === "string" &&
    typeof region === "string"
  );
}

/** Read the saved bookmarks, dropping any malformed entries. `[]` on the server. */
export function readBookmarks(): StoredPlace[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(BOOKMARKS_KEY) ?? "[]",
    );
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(isValidPlace)
      .map(({ lat, lon, name, region }) => ({ lat, lon, name, region }));
  } catch {
    return [];
  }
}

/** Persist the bookmark list (client-side write; no-op on the server). */
export function writeBookmarks(list: StoredPlace[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}
