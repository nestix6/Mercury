/**
 * Normalized weather types — the shape the rest of the app talks to.
 *
 * These intentionally describe *our* model, not any provider's response. The
 * Open-Meteo adapter (`./provider`) maps into these at the boundary, and the
 * sample snapshot in `./mock` is shaped the same. Keep provider specifics out
 * of this file.
 */

export type ConditionCode =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "windy";

export interface Condition {
  code: ConditionCode;
  /** Short human label, e.g. "Partly cloudy". */
  label: string;
}

/** Everything in metric / SI; the formatter converts at render time. */
export interface CurrentConditions {
  temperature: number; // °C
  feelsLike: number; // °C
  condition: Condition;
  high: number; // °C
  low: number; // °C
  windSpeed: number; // km/h
  windDirection: string; // compass, e.g. "NW"
  humidity: number; // %
  uvIndex: number; // 0–11+
  visibility: number; // km
  pressure: number; // hPa
  sunrise: string; // "HH:MM" (local)
  sunset: string; // "HH:MM" (local)
  isDay: boolean;
}

export interface HourForecast {
  /** "Now", or a local hour like "15:00". */
  label: string;
  temperature: number; // °C
  condition: Condition;
  precipitation: number; // % chance
  isDay: boolean;
}

export interface DayForecast {
  /** "Today", or a weekday like "Thu". */
  label: string;
  date: string; // "25 Jun"
  condition: Condition;
  high: number; // °C
  low: number; // °C
  precipitation: number; // % chance
}

export interface WeatherLocation {
  name: string;
  region: string;
  /** Pre-formatted local timestamp, e.g. "Wednesday 24 June, 14:08". */
  localTime: string;
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  current: CurrentConditions;
  hourly: HourForecast[];
  daily: DayForecast[];
}

export type Units = "metric" | "imperial";
