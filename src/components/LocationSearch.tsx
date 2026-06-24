"use client";

import { MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Manual location search (the primary path per the plan). Controlled so the
 * nav can render it in two responsive slots that stay in sync. Geocoding and
 * the Geolocation API aren't wired yet — this is the interactive shell: typing,
 * clearing, and a "use my location" affordance that degrades gracefully.
 */
export function LocationSearch({ value, onChange }: Props) {
  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="flex items-center gap-2"
    >
      <div className="glass flex flex-1 items-center gap-2 rounded-full py-2 pr-2 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-white/30">
        <MagnifyingGlass
          weight="light"
          className="size-5 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search for a city or place"
          aria-label="Search for a location"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            <X weight="bold" className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Use my location"
        className="glass flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-zinc-100 active:scale-[0.97]"
      >
        <MapPin weight="light" className="size-5" aria-hidden="true" />
      </button>
    </form>
  );
}
