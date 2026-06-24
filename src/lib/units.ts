import type { Units } from "@/lib/weather/types";

/** Cookie that persists the °C/°F choice across visits. */
export const UNITS_COOKIE = "mercury-units";

/**
 * Narrow an arbitrary cookie value to a valid `Units`, or `undefined`.
 * Lives here (not in the `"use client"` hook) so the Server Component can call
 * it when reading the cookie — a client export can't be invoked on the server.
 */
export function parseUnits(value: string | undefined | null): Units | undefined {
  return value === "metric" || value === "imperial" ? value : undefined;
}
