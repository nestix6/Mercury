"use client";

import { useCallback, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarksMenu } from "@/components/BookmarksMenu";
import { CurrentConditions } from "@/components/CurrentConditions";
import { DailyForecast } from "@/components/DailyForecast";
import { DetailsGrid } from "@/components/DetailsGrid";
import { HourlyStrip } from "@/components/HourlyStrip";
import { LocationSearch } from "@/components/LocationSearch";
import { UnitToggle } from "@/components/UnitToggle";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useGeolocation, type Coords } from "@/hooks/useGeolocation";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useUnits } from "@/hooks/useUnits";
import { writeGeoAsked, writePlace, type StoredPlace } from "@/lib/location-store";
import type { LocationSuggestion } from "@/lib/weather";
import type { Units, WeatherSnapshot } from "@/lib/weather/types";

/** Inline guidance when geolocation can't deliver coordinates. */
function geoHintFor(status: string): string | null {
  switch (status) {
    case "denied":
      return "Location access is blocked. Search for a place, or allow location for this site in your browser settings.";
    case "unavailable":
      return "Location isn't available on this device — try searching for a place instead.";
    case "error":
      return "Couldn't get your location. Try again, or search for a place instead.";
    default:
      return null;
  }
}

/**
 * Client shell for the weather view. Owns the unit toggle (presentation only)
 * and composes the forecast sections. The Server Component page hands it a
 * normalized snapshot from the Open-Meteo adapter; `source` flags when it had to
 * fall back to the sample snapshot (provider unreachable vs. place not found) so
 * the disclaimer can stay honest. When `autoLocate` is set (the bare default
 * view) it offers geolocation on mount and, if granted, navigates to the
 * coords-based view. `initialUnits` is the cookie-persisted °C/°F choice the
 * server read, so the first paint already shows the right unit. When `remember`
 * is set (any user-resolved live view) it persists the location so a return
 * visit restores it instead of re-prompting (3B).
 */
export function WeatherView({
  data,
  source = "live",
  autoLocate = false,
  remember = false,
  initialUnits = "metric",
}: {
  data: WeatherSnapshot;
  source?: "live" | "offline" | "missing";
  autoLocate?: boolean;
  remember?: boolean;
  initialUnits?: Units;
}) {
  const [units, setUnits] = useUnits(initialUnits);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { status, locate } = useGeolocation();
  const { suggestions, loading: searching } = useLocationSearch(query);
  const { bookmarks, has, toggle, remove } = useBookmarks();
  const { location, current, hourly, daily } = data;
  const geoHint = geoHintFor(status);

  const currentPlace: StoredPlace = {
    lat: location.latitude,
    lon: location.longitude,
    name: location.name,
    region: location.region,
  };

  // Navigate to a place that already carries its coords + label (a picked
  // suggestion or a bookmark): straight to that place, no re-geocode, with the
  // label passed through the URL so the server skips reverse geocoding.
  const goToPlace = useCallback(
    (place: StoredPlace) => {
      const params = new URLSearchParams({
        lat: place.lat.toFixed(3),
        lon: place.lon.toFixed(3),
        name: place.name,
      });
      if (place.region) params.set("region", place.region);
      router.push(`/weather?${params}`);
    },
    [router],
  );

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) =>
      goToPlace({
        lat: suggestion.latitude,
        lon: suggestion.longitude,
        name: suggestion.name,
        region: suggestion.region,
      }),
    [goToPlace],
  );

  const goToCoords = useCallback(
    (coords: Coords, mode: "push" | "replace" = "push") => {
      // 3 dp (~111 m) keeps a precise home location out of the URL/history while
      // still resolving the right Open-Meteo grid cell; the server rounds again
      // defensively. (2 dp could snap to an adjacent cell reading several °C off.)
      const url = `/weather?lat=${coords.latitude.toFixed(
        3,
      )}&lon=${coords.longitude.toFixed(3)}`;
      if (mode === "replace") router.replace(url);
      else router.push(url);
    },
    [router],
  );

  // Default view: prompt for location once on mount. Granting replaces this
  // entry (no Prague↔location back-button bounce); denying just stays on Prague.
  useEffect(() => {
    if (autoLocate) locate((coords) => goToCoords(coords, "replace"));
  }, [autoLocate, locate, goToCoords]);

  // Remember any user-resolved live location so a return visit restores it
  // instead of re-prompting (3B). The server reads this cookie on the next bare
  // `/weather`; we never store the Prague fallback (gated by `remember`).
  useEffect(() => {
    if (remember && source === "live") {
      writePlace({
        lat: location.latitude,
        lon: location.longitude,
        name: location.name,
        region: location.region,
      });
    }
  }, [remember, source, location]);

  // The auto-prompt was answered without a usable location — record it so we
  // stop auto-prompting on future visits (the pin button still works).
  useEffect(() => {
    if (status === "denied" || status === "unavailable" || status === "error") {
      writeGeoAsked();
    }
  }, [status]);

  const handleUseLocation = () => locate((coords) => goToCoords(coords, "push"));

  return (
    <main className="relative flex flex-1 flex-col text-zinc-100">
      {/* Calm ambient backdrop, same near-black mercury family as the landing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(90%_60%_at_50%_-15%,#171a20_0%,#0c0d11_50%,#070708_100%)]"
      />

      <header className="sticky top-0 z-30 pt-4">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <nav className="glass-dark w-full rounded-3xl px-4 py-2 sm:px-6 sm:py-2.5">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-chrome shrink-0 text-xl font-semibold tracking-tight"
              >
                Mercury
              </Link>
              <div className="hidden min-w-0 flex-1 sm:block">
                <LocationSearch
                  value={query}
                  onChange={setQuery}
                  suggestions={suggestions}
                  searching={searching}
                  onSelect={handleSelect}
                  onUseLocation={handleUseLocation}
                  locating={status === "locating"}
                />
              </div>
              <BookmarksMenu
                bookmarks={bookmarks}
                onSelect={goToPlace}
                onRemove={remove}
              />
              <UnitToggle value={units} onChange={setUnits} />
            </div>
            <div className="mt-3 sm:hidden">
              <LocationSearch
                value={query}
                onChange={setQuery}
                suggestions={suggestions}
                searching={searching}
                onSelect={handleSelect}
                onUseLocation={handleUseLocation}
                locating={status === "locating"}
              />
            </div>
          </nav>

          {geoHint ? (
            <p
              role="status"
              className="mt-2 flex items-center gap-1.5 px-1 text-xs text-amber-200/80"
            >
              <WarningCircle
                weight="fill"
                className="size-4 shrink-0 text-amber-300/80"
                aria-hidden="true"
              />
              {geoHint}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <div className="space-y-10 sm:space-y-12">
          <CurrentConditions
            current={current}
            location={location}
            units={units}
            isBookmarked={has(currentPlace)}
            onToggleBookmark={() => toggle(currentPlace)}
          />
          <DetailsGrid current={current} units={units} />
          <HourlyStrip hours={hourly} units={units} />
          <DailyForecast days={daily} units={units} />
        </div>
      </div>

      {source !== "live" ? (
        <div className="mx-auto w-full max-w-5xl px-5 pb-6 sm:px-8">
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-100/90"
          >
            <WarningCircle
              weight="fill"
              className="mt-0.5 size-5 shrink-0 text-amber-300/90"
              aria-hidden="true"
            />
            <p>
              {source === "missing"
                ? "We couldn't find that place. "
                : "Live weather is out of reach right now — Open-Meteo couldn't be loaded. "}
              The forecast below is{" "}
              <span className="font-medium text-amber-50">
                sample data, not real conditions
              </span>
              .
            </p>
          </div>
        </div>
      ) : null}

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-8 text-xs text-zinc-400 sm:px-8">
        <span>&copy; 2026 Mercury</span>
        {source !== "live" ? (
          <span>Showing sample data</span>
        ) : (
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded transition-colors hover:text-zinc-200"
          >
            Weather data by Open-Meteo
          </a>
        )}
      </footer>
    </main>
  );
}
