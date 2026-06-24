import type { Metadata } from "next";
import { WeatherView } from "@/components/WeatherView";
import { reverseGeocode } from "@/lib/geo/reverse";
import { getWeatherByCoords, getWeatherByQuery } from "@/lib/weather";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const DEFAULT_QUERY = "Prague";

type SearchParams = {
  q?: string | string[];
  lat?: string | string[];
  lon?: string | string[];
};

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse a coordinate param, rejecting anything out of range (or non-numeric). */
function readCoord(
  value: string | string[] | undefined,
  max: number,
): number | null {
  const raw = readParam(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

function readCoords(params: SearchParams): { lat: number; lon: number } | null {
  const lat = readCoord(params.lat, 90);
  const lon = readCoord(params.lon, 180);
  return lat !== null && lon !== null ? { lat, lon } : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const description =
    "Current conditions, an hourly view, and a seven-day forecast. Fast, calm, and accurate.";

  if (readCoords(params)) return { title: "My location · Mercury", description };

  const q = readParam(params.q)?.trim();
  const name = q ? q.charAt(0).toUpperCase() + q.slice(1) : DEFAULT_QUERY;
  return { title: `${name} · Mercury`, description };
}

// Server Component. Three entry points:
//   • ?lat&lon  → "use my location": forecast by coords + reverse-geocoded label
//   • ?q        → a searched place
//   • neither   → default (Prague), and the client offers geolocation on mount
// Any provider failure falls back to the sample snapshot so the page always renders.
export default async function WeatherPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const coords = readCoords(params);
  const query = readParam(params.q)?.trim();

  let data = MOCK_WEATHER;
  // "offline" = provider unreachable; "missing" = a searched place wasn't found.
  // The view shows a different disclaimer for each so the fallback isn't mistaken
  // for real data.
  let source: "live" | "offline" | "missing" = "offline";
  // Only the bare default view auto-prompts for location — never after the user
  // has already searched or shared coordinates.
  const autoLocate = !coords && !query;

  try {
    if (coords) {
      const label = await reverseGeocode(coords.lat, coords.lon);
      data = await getWeatherByCoords(coords.lat, coords.lon, label ?? undefined);
      source = "live";
    } else {
      const live = await getWeatherByQuery(query || DEFAULT_QUERY);
      if (live) {
        data = live;
        source = "live";
      } else {
        // No geocoding match. A user query that misses is "missing"; the default
        // query coming back empty means geocoding itself is effectively down.
        source = query ? "missing" : "offline";
      }
    }
  } catch {
    // Network/provider error — keep the sample fallback ("offline").
  }

  return <WeatherView data={data} source={source} autoLocate={autoLocate} />;
}
