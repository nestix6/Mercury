"use server";

/**
 * Server Action boundary for the search autocomplete. Keeps Open-Meteo specifics
 * server-side (no public GET endpoint, no provider details on the client bundle)
 * while letting the client `useLocationSearch` hook fetch candidates as the user
 * types. Caching/rate limiting still happen inside the adapter (`cachedFetch`).
 */

import { searchSuggestions, type LocationSuggestion } from "@/lib/weather";

/** Minimum query length before we bother the geocoder. */
const MIN_QUERY = 2;

export async function searchLocationsAction(
  query: string,
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];
  try {
    return await searchSuggestions(q);
  } catch {
    // Rate limited or provider hiccup — degrade to no suggestions rather than
    // throwing into the client; the Enter-to-search fallback still works.
    return [];
  }
}
