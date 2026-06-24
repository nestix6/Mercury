"use client";

import {
  CircleNotch,
  MagnifyingGlass,
  MapPin,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Trigger the browser geolocation flow (owned by the parent). */
  onUseLocation?: () => void;
  /** Whether a geolocation request is in flight. */
  locating?: boolean;
}

/**
 * Manual location search (the primary path per the plan). Controlled so the
 * nav can render it in two responsive slots that stay in sync. Submitting
 * navigates to `/weather?q=…`, where the Server Component geocodes it via
 * Open-Meteo. The pin button hands off to the parent's geolocation flow.
 */
export function LocationSearch({
  value,
  onChange,
  onUseLocation,
  locating = false,
}: Props) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query) router.push(`/weather?q=${encodeURIComponent(query)}`);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
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
        onClick={onUseLocation}
        disabled={locating}
        aria-label="Use my location"
        title="Use my location"
        className="glass flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-zinc-100 active:scale-[0.97] disabled:cursor-progress disabled:text-zinc-500"
      >
        {locating ? (
          <CircleNotch
            weight="bold"
            className="size-5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <MapPin weight="light" className="size-5" aria-hidden="true" />
        )}
      </button>
    </form>
  );
}
