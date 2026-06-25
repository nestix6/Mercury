/**
 * Public interface for the weather data layer. The app imports from here and
 * stays unaware of which provider sits behind it (currently Open-Meteo, see
 * `./provider`).
 */

export {
  getWeatherByQuery,
  getWeatherByCoords,
  searchLocations,
  searchSuggestions,
  type GeoResult,
  type LocationSuggestion,
} from "@/lib/weather/provider";
