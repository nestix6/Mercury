"use client";

import { useEffect, useState } from "react";
import { searchLocationsAction } from "@/lib/weather/actions";
import type { LocationSuggestion } from "@/lib/weather";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

/**
 * Debounced location autocomplete. Owned by `WeatherView` so a single fetch
 * serves both responsive nav slots (the desktop + mobile `LocationSearch`
 * instances). Skips queries under `MIN_QUERY` and debounces input; each effect
 * run owns a `cancelled` flag so a superseded (or unmounted) request can't
 * commit a stale result.
 */
export function useLocationSearch(query: string) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;

    // All state updates happen inside the timer (never synchronously in the
    // effect body); a query change clears it before it fires, and `cancelled`
    // discards any result that resolves after this run was superseded.
    const timer = setTimeout(
      async () => {
        if (trimmed.length < MIN_QUERY) {
          setSuggestions([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        const results = await searchLocationsAction(trimmed);
        if (cancelled) return;
        setSuggestions(results);
        setLoading(false);
      },
      trimmed.length < MIN_QUERY ? 0 : DEBOUNCE_MS,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { suggestions, loading };
}
