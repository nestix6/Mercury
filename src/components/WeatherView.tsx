"use client";

import { useCallback, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CurrentConditions } from "@/components/CurrentConditions";
import { DailyForecast } from "@/components/DailyForecast";
import { DetailsGrid } from "@/components/DetailsGrid";
import { HourlyStrip } from "@/components/HourlyStrip";
import { LocationSearch } from "@/components/LocationSearch";
import { UnitToggle } from "@/components/UnitToggle";
import { useGeolocation, type Coords } from "@/hooks/useGeolocation";
import type { Units, WeatherSnapshot } from "@/lib/weather/types";

/**
 * Client shell for the weather view. Owns the unit toggle (presentation only)
 * and composes the forecast sections. The Server Component page hands it a
 * normalized snapshot from the Open-Meteo adapter; `source` flags when it had to
 * fall back to the sample snapshot (provider unreachable vs. place not found) so
 * the disclaimer can stay honest. When `autoLocate` is set (the bare default
 * view) it offers geolocation on mount and, if granted, navigates to the
 * coords-based view.
 */
export function WeatherView({
  data,
  source = "live",
  autoLocate = false,
}: {
  data: WeatherSnapshot;
  source?: "live" | "offline" | "missing";
  autoLocate?: boolean;
}) {
  const [units, setUnits] = useState<Units>("metric");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { status, locate } = useGeolocation();
  const { location, current, hourly, daily } = data;

  const goToCoords = useCallback(
    (coords: Coords, mode: "push" | "replace" = "push") => {
      // 2 dp (~1.1 km) is plenty for a forecast and keeps a precise home
      // location out of the URL/history; the server rounds again defensively.
      const url = `/weather?lat=${coords.latitude.toFixed(
        2,
      )}&lon=${coords.longitude.toFixed(2)}`;
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
                  onUseLocation={handleUseLocation}
                  locating={status === "locating"}
                />
              </div>
              <UnitToggle value={units} onChange={setUnits} />
            </div>
            <div className="mt-3 sm:hidden">
              <LocationSearch
                value={query}
                onChange={setQuery}
                onUseLocation={handleUseLocation}
                locating={status === "locating"}
              />
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <div className="space-y-10 sm:space-y-12">
          <CurrentConditions
            current={current}
            location={location}
            units={units}
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

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-8 text-xs text-zinc-500 sm:px-8">
        <span>&copy; 2026 Mercury</span>
        {source !== "live" ? (
          <span>Showing sample data</span>
        ) : (
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-zinc-300"
          >
            Weather data by Open-Meteo
          </a>
        )}
      </footer>
    </main>
  );
}
