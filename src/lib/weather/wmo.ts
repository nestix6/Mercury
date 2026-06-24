/**
 * WMO weather-interpretation codes → our normalized `Condition`.
 *
 * Open-Meteo reports conditions as WMO codes (0–99). This is the only place
 * those numbers are understood; everything downstream talks in `ConditionCode`.
 * See https://open-meteo.com/en/docs (WMO Weather interpretation codes).
 */

import type { Condition, ConditionCode } from "@/lib/weather/types";

interface WmoEntry {
  code: ConditionCode;
  label: string;
}

const WMO: Record<number, WmoEntry> = {
  0: { code: "clear", label: "Clear sky" },
  1: { code: "clear", label: "Mainly clear" },
  2: { code: "partly-cloudy", label: "Partly cloudy" },
  3: { code: "overcast", label: "Overcast" },
  45: { code: "fog", label: "Fog" },
  48: { code: "fog", label: "Rime fog" },
  51: { code: "drizzle", label: "Light drizzle" },
  53: { code: "drizzle", label: "Drizzle" },
  55: { code: "drizzle", label: "Dense drizzle" },
  56: { code: "drizzle", label: "Freezing drizzle" },
  57: { code: "drizzle", label: "Freezing drizzle" },
  61: { code: "rain", label: "Light rain" },
  63: { code: "rain", label: "Rain" },
  65: { code: "rain", label: "Heavy rain" },
  66: { code: "rain", label: "Freezing rain" },
  67: { code: "rain", label: "Heavy freezing rain" },
  71: { code: "snow", label: "Light snow" },
  73: { code: "snow", label: "Snow" },
  75: { code: "snow", label: "Heavy snow" },
  77: { code: "snow", label: "Snow grains" },
  80: { code: "rain", label: "Light showers" },
  81: { code: "rain", label: "Showers" },
  82: { code: "rain", label: "Violent showers" },
  85: { code: "snow", label: "Snow showers" },
  86: { code: "snow", label: "Heavy snow showers" },
  95: { code: "thunderstorm", label: "Thunderstorm" },
  96: { code: "thunderstorm", label: "Thunderstorm with hail" },
  99: { code: "thunderstorm", label: "Severe thunderstorm" },
};

// Codes outside the table are rare/unmodelled; "Cloudy" is the safe neutral.
const FALLBACK: WmoEntry = { code: "cloudy", label: "Cloudy" };

export function wmoToCondition(code: number): Condition {
  const { code: conditionCode, label } = WMO[code] ?? FALLBACK;
  return { code: conditionCode, label };
}
