import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WeatherView } from "@/components/WeatherView";
import { reverseGeocode } from "@/lib/geo/reverse";
import {
  GEO_ASKED_COOKIE,
  parsePlace,
  PLACE_COOKIE,
  type StoredPlace,
} from "@/lib/location-store";
import { parseUnits, UNITS_COOKIE } from "@/lib/units";
import { getWeatherByCoords, getWeatherByQuery } from "@/lib/weather";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const DEFAULT_QUERY = "Prague";

type SearchParams = {
  q?: string | string[];
  lat?: string | string[];
  lon?: string | string[];
  name?: string | string[];
  region?: string | string[];
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

  if (readCoords(params)) {
    // A search-selected place carries its own name; only the bare geolocation
    // path falls back to the generic "My location" title.
    const place = readParam(params.name)?.trim();
    return { title: `${place || "My location"} · Mercury`, description };
  }

  const q = readParam(params.q)?.trim();
  if (!q) {
    // Bare view: a remembered location is restored, so title it accordingly.
    const stored = parsePlace((await cookies()).get(PLACE_COOKIE)?.value);
    if (stored) return { title: `${stored.name} · Mercury`, description };
  }
  const name = q ? q.charAt(0).toUpperCase() + q.slice(1) : DEFAULT_QUERY;
  return { title: `${name} · Mercury`, description };
}

// Server Component. Entry points:
//   • ?lat&lon  → "use my location" / a picked search result (coords + label)
//   • ?q        → a searched place
//   • neither   → a remembered location (3B), else the Prague default with a
//                 one-time geolocation prompt on mount
// Any provider failure falls back to the sample snapshot so the page always renders.
export default async function WeatherPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const coords = readCoords(params);
  const query = readParam(params.q)?.trim();

  const cookieStore = await cookies();
  // Read the persisted unit choice server-side so the first paint already shows
  // the right unit (no °C→°F flash). Defaults to metric on a fresh visitor.
  const initialUnits = parseUnits(cookieStore.get(UNITS_COOKIE)?.value) ?? "metric";

  // On the bare view, restore the last remembered location (3B) instead of
  // Prague, and never re-prompt for geolocation once we've already asked.
  const isBare = !coords && !query;
  const restored: StoredPlace | null = isBare
    ? parsePlace(cookieStore.get(PLACE_COOKIE)?.value)
    : null;
  const geoAsked = cookieStore.get(GEO_ASKED_COOKIE)?.value === "1";
  // Prompt for location only on a first-ever bare visit: nothing remembered and
  // we haven't asked before. Otherwise the pin button is the way in.
  const autoLocate = isBare && !restored && !geoAsked;

  let data = MOCK_WEATHER;
  // "offline" = provider unreachable; "missing" = a searched place wasn't found.
  // The view shows a different disclaimer for each so the fallback isn't mistaken
  // for real data.
  let source: "live" | "offline" | "missing" = "offline";
  // Persist the resolved location for next time — but never the Prague fallback.
  let remember = false;

  try {
    if (coords) {
      // A search-selected candidate hands us its label in the URL, so use it
      // directly and skip reverse geocoding; the bare geolocation path (no name)
      // still resolves a name via the reverse geocoder.
      const name = readParam(params.name)?.trim();
      const label = name
        ? { name, region: readParam(params.region)?.trim() ?? "" }
        : await reverseGeocode(coords.lat, coords.lon);
      data = await getWeatherByCoords(coords.lat, coords.lon, label ?? undefined);
      source = "live";
      remember = true;
    } else if (restored) {
      // Remembered location: fetch by its coords + stored label (no re-geocode).
      data = await getWeatherByCoords(restored.lat, restored.lon, {
        name: restored.name,
        region: restored.region,
      });
      source = "live";
      remember = true;
    } else {
      const live = await getWeatherByQuery(query || DEFAULT_QUERY);
      if (live) {
        data = live;
        source = "live";
        // Remember an explicit search, but not the bare Prague default.
        remember = Boolean(query);
      } else {
        // No geocoding match. A user query that misses is "missing"; the default
        // query coming back empty means geocoding itself is effectively down.
        source = query ? "missing" : "offline";
      }
    }
  } catch {
    // Network/provider error — keep the sample fallback ("offline").
  }

  return (
    <WeatherView
      data={data}
      source={source}
      autoLocate={autoLocate}
      remember={remember}
      initialUnits={initialUnits}
    />
  );
}
