/**
 * Display formatting + unit conversion. The app stores everything in metric
 * (see `lib/weather/types`) and converts only at render time, so the unit
 * toggle is purely a presentation concern.
 */

import type { Units } from "@/lib/weather/types";

const DEGREE = "°";

export function toFahrenheit(celsius: number): number {
  return celsius * (9 / 5) + 32;
}

/** Rounded temperature with a degree sign, e.g. "22°". */
export function formatTemp(celsius: number, units: Units): string {
  const value = units === "imperial" ? toFahrenheit(celsius) : celsius;
  return `${Math.round(value)}${DEGREE}`;
}

/** Bare rounded temperature, no degree sign — for tight rows. */
export function formatTempValue(celsius: number, units: Units): number {
  const value = units === "imperial" ? toFahrenheit(celsius) : celsius;
  return Math.round(value);
}

export function temperatureUnit(units: Units): string {
  return units === "imperial" ? `${DEGREE}F` : `${DEGREE}C`;
}

export function formatWind(kph: number, units: Units): string {
  if (units === "imperial") return `${Math.round(kph * 0.621371)} mph`;
  return `${Math.round(kph)} km/h`;
}

export function formatVisibility(km: number, units: Units): string {
  if (units === "imperial") return `${Math.round(km * 0.621371)} mi`;
  return `${Math.round(km)} km`;
}

export function formatPressure(hpa: number, units: Units): string {
  if (units === "imperial") return `${(hpa * 0.02953).toFixed(2)} inHg`;
  return `${Math.round(hpa)} hPa`;
}

export function uvDescriptor(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very high";
  return "Extreme";
}
