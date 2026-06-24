/**
 * Reverse geocoding (coordinates → place name) for the "use my location" flow.
 *
 * Open-Meteo only does name → coordinates, so this is a separate, isolated
 * provider (BigDataCloud's keyless reverse-geocode-client). Keeping it in its
 * own module preserves the weather adapter's provider discipline — the weather
 * layer never imports this, and swapping reverse geocoders stays a one-file job.
 *
 * Call volume is kept low on purpose (BigDataCloud's free tier isn't a hard
 * guarantee). Layers, cheapest first: round coords to ~1.1 km so jitter collapses
 * onto one key; a 24 h cache + per-instance memo (see `@/lib/outbound`); and a
 * per-minute / per-hour budget that only counts true misses. When the budget is
 * spent we return null and the caller falls back to a generic "My location".
 */

import { cachedFetch, createLimiter, HOUR, MINUTE } from "@/lib/outbound";

export interface PlaceLabel {
  name: string;
  region: string;
}

const ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const REVALIDATE = 60 * 60 * 24; // a day — a coordinate's place name doesn't move

const limiter = createLimiter([
  { limit: 200, windowMs: HOUR },
  { limit: 30, windowMs: MINUTE },
]);

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

function round(value: number): number {
  return Math.round(value * 100) / 100; // 2 dp ≈ 1.1 km
}

function toLabel(json: unknown): PlaceLabel | null {
  const data = json as BigDataCloudResponse;
  const name = data.city || data.locality || data.principalSubdivision;
  if (!name) return null; // genuine "no place here" — cached as a negative

  const region = [
    data.principalSubdivision && data.principalSubdivision !== name
      ? data.principalSubdivision
      : null,
    data.countryName,
  ]
    .filter(Boolean)
    .join(", ");

  return { name, region };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<PlaceLabel | null> {
  const params = new URLSearchParams({
    latitude: String(round(latitude)),
    longitude: String(round(longitude)),
    localityLanguage: "en",
  });
  const url = `${ENDPOINT}?${params}`;

  try {
    // null here means either a cached "no place" or a spent budget; both fall
    // back to the generic label upstream, which is what we want.
    return await cachedFetch<PlaceLabel | null>({
      key: url,
      url,
      revalidate: REVALIDATE,
      memoTtlMs: REVALIDATE * 1000,
      limiter,
      transform: toLabel,
    });
  } catch {
    return null; // transient (network / non-2xx) — don't poison; just fall back
  }
}
