/**
 * Open-Meteo adapter. The only file that knows the provider's URLs and JSON
 * shape — it maps everything into our normalized `WeatherSnapshot` so swapping
 * providers later stays a one-file change (AGENTS.md: "normalize at the
 * boundary"). No API key is required.
 *
 * We hit the JSON API with native `fetch` + Next's `revalidate` rather than the
 * `openmeteo` SDK: the SDK speaks FlatBuffers and bypasses Next's fetch cache,
 * whereas this keeps caching centralized and the response off the client bundle.
 *
 * Docs: https://open-meteo.com/en/docs
 */

import type {
  CurrentConditions,
  DayForecast,
  HourForecast,
  WeatherLocation,
  WeatherSnapshot,
} from "@/lib/weather/types";
import { wmoToCondition } from "@/lib/weather/wmo";
import { cachedFetch, createLimiter, HOUR, MINUTE } from "@/lib/outbound";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// City coordinates effectively never change, so geocoding caches for a day.
const GEOCODE_REVALIDATE = 60 * 60 * 24;

// Forecast freshness is governed by this per-instance memo, not Next's durable
// cache: the forecast fetch uses `cache: "no-store"` (see fetchForecast) so a
// visit after an idle gap is never served a stale-while-revalidate snapshot.
// The memo is a hard TTL — a miss fetches synchronously — so data is at most
// ~5 min stale, while repeat loads within the window still skip the network.
// Open-Meteo's current values update ~hourly and its free limits are generous
// (5000/hr), so a network hit per cold visit is well within budget.
const FORECAST_MEMO_TTL = 60 * 5 * 1000;

// Circuit breakers for Open-Meteo. Ceilings are generous (they never trip in
// normal use) but stay well under Open-Meteo's free limits (600/min, 5000/hr)
// even with both call types combined. The real limiter is the cache above;
// these only catch runaway/abusive call volume and fail over to sample data.
const forecastLimiter = createLimiter([
  { limit: 1500, windowMs: HOUR },
  { limit: 150, windowMs: MINUTE },
]);
const geocodeLimiter = createLimiter([
  { limit: 600, windowMs: HOUR },
  { limit: 60, windowMs: MINUTE },
]);

// Round coords to collapse GPS jitter onto one cache key (and keep the precise
// home location out of the URL). Use 3 dp (~111 m): Open-Meteo's high-res models
// (best_match picks ICON-D2/AROME here) resolve finer than 1 km, so rounding to
// 2 dp could snap into an adjacent grid cell reading several °C apart — e.g. for
// Bratislava, 2 dp landed in a cell ~3 °C hotter than the actual point. 3 dp
// stays inside the same cell while still deduping near-identical lookups.
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000; // 3 dp ≈ 111 m
}

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "surface_pressure",
  "pressure_msl",
  "is_day",
].join(",");

const HOURLY_FIELDS = [
  "temperature_2m",
  "weather_code",
  "precipitation_probability",
  "is_day",
  "visibility",
  "uv_index",
].join(",");

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "sunrise",
  "sunset",
].join(",");

/**
 * How a place is labeled in the UI. Resolved before the forecast fetch — from
 * Open-Meteo geocoding (search path) or a reverse geocoder (geolocation path) —
 * so this adapter never needs to know which produced it.
 */
export interface PlaceLabel {
  name: string;
  region: string;
}

/** A geocoding hit — enough to fetch a forecast and label the place. */
export interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

/**
 * A slim, UI-ready geocoding candidate for the search autocomplete. Carries the
 * coords + display label so picking one navigates straight to that exact place
 * (no re-geocode-and-guess) without an extra reverse-geocode call.
 */
export interface LocationSuggestion {
  id: number;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

interface GeocodeResponse {
  results?: GeoResult[];
}

interface ForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
    pressure_msl: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: (number | null)[];
    is_day: number[];
    visibility: number[];
    uv_index: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

function toCompass(degrees: number): string {
  return COMPASS[Math.round(degrees / 22.5) % 16];
}

// Open-Meteo returns naive local ISO strings ("2026-06-24T14:00") when
// timezone=auto. We pull pieces out by position so we never reinterpret them
// through the server's own timezone.
function hourMinute(iso: string): string {
  return iso.slice(11, 16);
}

// Anchor date-only strings at midday UTC and format in UTC — gives a stable
// weekday/day/month for the location regardless of where this code runs.
function partsFromDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}

function fullLocalTime(iso: string): string {
  const day = partsFromDate(iso, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${day}, ${hourMinute(iso)}`;
}

function describeRegion(place: GeoResult): string {
  // Drop admin1 when it just echoes the city name (e.g. "Prague, Prague").
  const region = place.admin1 && place.admin1 !== place.name ? place.admin1 : null;
  return [region, place.country].filter(Boolean).join(", ");
}

export async function searchLocations(
  query: string,
  count = 5,
): Promise<GeoResult[]> {
  // Normalize so "Prague", "prague", and " Prague " share one cache entry
  // (geocoding is case-insensitive; the display name comes back properly cased).
  const name = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!name) return [];

  const params = new URLSearchParams({
    name,
    count: String(count),
    language: "en",
    format: "json",
  });
  const url = `${GEOCODE_URL}?${params}`;

  const data = await cachedFetch<GeocodeResponse>({
    key: url,
    url,
    revalidate: GEOCODE_REVALIDATE,
    memoTtlMs: GEOCODE_REVALIDATE * 1000,
    limiter: geocodeLimiter,
    transform: (json) => json as GeocodeResponse,
  });
  // null = rate limited; surface as a provider error so the page shows "offline"
  // rather than a misleading "we couldn't find that place".
  if (!data) throw new Error("Open-Meteo geocoding rate limit reached");

  return data.results ?? [];
}

/**
 * Search candidates for the autocomplete dropdown. Reuses `describeRegion` so the
 * candidate label matches what the forecast header would show for that place.
 */
export async function searchSuggestions(
  query: string,
): Promise<LocationSuggestion[]> {
  const results = await searchLocations(query, 5);
  return results.map((place) => ({
    id: place.id,
    name: place.name,
    region: describeRegion(place),
    latitude: place.latitude,
    longitude: place.longitude,
  }));
}

async function fetchForecast(
  latitude: number,
  longitude: number,
  label: PlaceLabel | null,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(roundCoord(latitude)),
    longitude: String(roundCoord(longitude)),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    timezone: "auto",
    forecast_days: "7",
  });
  const url = `${FORECAST_URL}?${params}`;

  // Cache the raw response (it depends only on the coords/URL); apply the label
  // afterwards so the same coordinates can carry different display names.
  const data = await cachedFetch<ForecastResponse>({
    key: url,
    url,
    memoTtlMs: FORECAST_MEMO_TTL,
    limiter: forecastLimiter,
    transform: (json) => json as ForecastResponse,
    // Bypass Next's stale-while-revalidate cache: on a low-traffic app the first
    // visit after an idle gap would otherwise be served a stale snapshot. The
    // 5-min memo (a hard TTL, synchronous on miss) is the freshness guard instead.
    cache: "no-store",
  });
  if (!data) throw new Error("Open-Meteo forecast rate limit reached");

  return normalize(data, label, roundCoord(latitude), roundCoord(longitude));
}

function normalize(
  data: ForecastResponse,
  label: PlaceLabel | null,
  latitude: number,
  longitude: number,
): WeatherSnapshot {
  const { current, hourly, daily } = data;

  // Align the hourly arrays (they start at local midnight) to the current hour.
  const currentHourKey = current.time.slice(0, 13); // "YYYY-MM-DDTHH"
  const nowIndex = Math.max(
    0,
    hourly.time.findIndex((t) => t.slice(0, 13) === currentHourKey),
  );
  const todayKey = current.time.slice(0, 10);

  const location: WeatherLocation = {
    // No label means the coords came from geolocation and reverse geocoding
    // didn't resolve a name — fall back to a generic label + the timezone.
    name: label?.name ?? "My location",
    region: label?.region || data.timezone,
    localTime: fullLocalTime(current.time),
    latitude,
    longitude,
  };

  const conditions: CurrentConditions = {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    condition: wmoToCondition(current.weather_code),
    high: daily.temperature_2m_max[0],
    low: daily.temperature_2m_min[0],
    windSpeed: current.wind_speed_10m,
    windDirection: toCompass(current.wind_direction_10m),
    humidity: Math.round(current.relative_humidity_2m),
    // UV/visibility aren't in `current`; read them off the hourly arrays.
    uvIndex: Math.round(hourly.uv_index[nowIndex] ?? 0),
    visibility: (hourly.visibility[nowIndex] ?? 0) / 1000, // m → km
    // Show mean-sea-level pressure (the familiar ~1013 hPa baseline), not the
    // elevation-adjusted station pressure.
    pressure: current.pressure_msl || current.surface_pressure,
    sunrise: hourMinute(daily.sunrise[0]),
    sunset: hourMinute(daily.sunset[0]),
    isDay: current.is_day === 1,
  };

  const hours: HourForecast[] = [];
  for (let i = nowIndex; i < nowIndex + 24 && i < hourly.time.length; i++) {
    hours.push({
      label: i === nowIndex ? "Now" : hourMinute(hourly.time[i]),
      temperature: hourly.temperature_2m[i],
      condition: wmoToCondition(hourly.weather_code[i]),
      precipitation: hourly.precipitation_probability[i] ?? 0,
      isDay: hourly.is_day[i] === 1,
    });
  }

  const days: DayForecast[] = daily.time.map((date, i) => ({
    label: date.slice(0, 10) === todayKey ? "Today" : partsFromDate(date, { weekday: "short" }),
    date: partsFromDate(date, { day: "numeric", month: "short" }),
    condition: wmoToCondition(daily.weather_code[i]),
    high: daily.temperature_2m_max[i],
    low: daily.temperature_2m_min[i],
    precipitation: daily.precipitation_probability_max[i] ?? 0,
  }));

  return { location, current: conditions, hourly: hours, daily: days };
}

/** Resolve a place name to a forecast, or `null` when no place matches. */
export async function getWeatherByQuery(
  query: string,
): Promise<WeatherSnapshot | null> {
  const [place] = await searchLocations(query, 1);
  if (!place) return null;
  return fetchForecast(place.latitude, place.longitude, {
    name: place.name,
    region: describeRegion(place),
  });
}

/**
 * Forecast for explicit coordinates (the "use my location" path). The caller
 * resolves the display label (e.g. via reverse geocoding); pass `undefined` to
 * let the view fall back to a generic label.
 */
export async function getWeatherByCoords(
  latitude: number,
  longitude: number,
  label?: PlaceLabel,
): Promise<WeatherSnapshot> {
  return fetchForecast(latitude, longitude, label ?? null);
}
