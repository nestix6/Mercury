"use client";

import { useState } from "react";
import Link from "next/link";
import { CurrentConditions } from "@/components/CurrentConditions";
import { DailyForecast } from "@/components/DailyForecast";
import { DetailsGrid } from "@/components/DetailsGrid";
import { HourlyStrip } from "@/components/HourlyStrip";
import { LocationSearch } from "@/components/LocationSearch";
import { UnitToggle } from "@/components/UnitToggle";
import type { Units, WeatherSnapshot } from "@/lib/weather/types";

/**
 * Client shell for the weather view. Owns the unit toggle (presentation only)
 * and composes the forecast sections. The Server Component page hands it a
 * normalized snapshot — today that's mock data, later the Open-Meteo adapter.
 */
export function WeatherView({ data }: { data: WeatherSnapshot }) {
  const [units, setUnits] = useState<Units>("metric");
  const [query, setQuery] = useState("");
  const { location, current, hourly, daily } = data;

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
                <LocationSearch value={query} onChange={setQuery} />
              </div>
              <UnitToggle value={units} onChange={setUnits} />
            </div>
            <div className="mt-3 sm:hidden">
              <LocationSearch value={query} onChange={setQuery} />
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

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-8 text-xs text-zinc-500 sm:px-8">
        <span>&copy; 2026 Mercury</span>
        <span>Showing sample data</span>
      </footer>
    </main>
  );
}
