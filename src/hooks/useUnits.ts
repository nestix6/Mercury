"use client";

import { useCallback, useState } from "react";
import { UNITS_COOKIE } from "@/lib/units";
import type { Units } from "@/lib/weather/types";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Unit choice (°C/°F), persisted in a cookie. The cookie (not localStorage) is
 * deliberate: the Server Component reads it and seeds `initial`, so the first
 * paint already shows the saved unit — no flash of metric before switching.
 * Changing the unit writes the cookie back so the next visit stays consistent.
 */
export function useUnits(initial: Units) {
  const [units, setUnitsState] = useState<Units>(initial);

  const setUnits = useCallback((next: Units) => {
    setUnitsState(next);
    document.cookie = `${UNITS_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }, []);

  return [units, setUnits] as const;
}
