/**
 * Persistence for the "remember my last location" behaviour (3B).
 *
 * Two cookies, read by the Server Component so the first paint already shows the
 * remembered place (no Prague flash) and the bare `/weather` view stops
 * re-prompting for geolocation on every visit:
 *
 *   • `mercury-place`     — the last user-resolved location (coords + label), so
 *                           a return visit restores it instead of the Prague
 *                           default. Written client-side after any live view.
 *   • `mercury-geo-asked` — set once the auto-prompt was answered without a place
 *                           (denied / unavailable), so we don't keep prompting.
 *                           A granted prompt writes `mercury-place` instead,
 *                           which already suppresses the auto-prompt.
 *
 * A plain module (not a `"use client"` hook) so the server page can parse the
 * cookies while the client writes them with `document.cookie`.
 */

export const PLACE_COOKIE = "mercury-place";
export const GEO_ASKED_COOKIE = "mercury-geo-asked";

/** A remembered location — enough to fetch a forecast and label it on restore. */
export interface StoredPlace {
  lat: number;
  lon: number;
  name: string;
  region: string;
}

/** Serialize for a cookie value (URL-encoded so the JSON's commas are safe). */
export function serializePlace(place: StoredPlace): string {
  return encodeURIComponent(JSON.stringify(place));
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remember a resolved location (client-side write; mirrors `useUnits`). */
export function writePlace(place: StoredPlace): void {
  document.cookie = `${PLACE_COOKIE}=${serializePlace(place)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** Record that the geolocation prompt was answered without yielding a place. */
export function writeGeoAsked(): void {
  document.cookie = `${GEO_ASKED_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** Parse a cookie value back to a `StoredPlace`, or `null` if absent/invalid. */
export function parsePlace(value: string | undefined | null): StoredPlace | null {
  if (!value) return null;
  try {
    const raw: unknown = JSON.parse(decodeURIComponent(value));
    if (!raw || typeof raw !== "object") return null;
    const { lat, lon, name, region } = raw as Record<string, unknown>;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      typeof name !== "string" ||
      typeof region !== "string"
    ) {
      return null;
    }
    return { lat, lon, name, region };
  } catch {
    return null;
  }
}
