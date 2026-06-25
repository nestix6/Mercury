"use client";

import { useId, useRef, useState } from "react";
import {
  CircleNotch,
  MagnifyingGlass,
  MapPin,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { LocationSuggestion } from "@/lib/weather";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Debounced autocomplete candidates for the current query (from the parent). */
  suggestions?: LocationSuggestion[];
  /** Whether a suggestion fetch is in flight. */
  searching?: boolean;
  /** Pick a candidate — the parent navigates to that exact place. */
  onSelect?: (suggestion: LocationSuggestion) => void;
  /** Trigger the browser geolocation flow (owned by the parent). */
  onUseLocation?: () => void;
  /** Whether a geolocation request is in flight. */
  locating?: boolean;
}

/**
 * Manual location search (the primary path per the plan). Controlled so the
 * nav can render it in two responsive slots that stay in sync. As the user
 * types, a debounced autocomplete (candidates supplied by the parent) lets them
 * disambiguate ambiguous names ("Paris", "Springfield") — picking one hands the
 * exact place back to the parent. Submitting without a selection falls back to
 * `/weather?q=…`, where the Server Component geocodes the raw text. The pin
 * button hands off to the parent's geolocation flow.
 */
export function LocationSearch({
  value,
  onChange,
  suggestions = [],
  searching = false,
  onSelect,
  onUseLocation,
  locating = false,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The list shows only when focused, with a query present and candidates ready.
  const showList = open && value.trim().length >= 2 && suggestions.length > 0;
  const activeId =
    showList && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined;

  function selectSuggestion(suggestion: LocationSuggestion) {
    onChange(suggestion.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(suggestion);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Enter on a highlighted candidate picks it; otherwise fall back to ?q=.
    if (showList && activeIndex >= 0) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    const query = value.trim();
    if (query) {
      setOpen(false);
      router.push(`/weather?q=${encodeURIComponent(query)}`);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showList) {
      // Reopen the list on the first arrow press after it was dismissed.
      if (
        (event.key === "ArrowDown" || event.key === "ArrowUp") &&
        suggestions.length > 0
      ) {
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="relative flex items-center gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <div className="glass flex items-center gap-2 rounded-full py-2 pr-2 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-white/30">
          <MagnifyingGlass
            weight="light"
            className="size-5 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay so a click on a suggestion lands before the list closes.
              blurTimer.current = setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for a city or place"
            aria-label="Search for a location"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {searching ? (
            <CircleNotch
              weight="bold"
              className="size-4 shrink-0 animate-spin text-zinc-400"
              aria-hidden="true"
            />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setActiveIndex(-1);
              }}
              aria-label="Clear search"
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
            >
              <X weight="bold" className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Location suggestions"
            className="glass absolute top-full left-0 z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl p-1.5 shadow-xl shadow-black/40"
          >
            {suggestions.map((suggestion, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={suggestion.id}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={isActive}
                  // Keep the click from blurring the input before it fires.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    selectSuggestion(suggestion);
                  }}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2 transition-colors ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {suggestion.name}
                  </span>
                  {suggestion.region ? (
                    <span className="truncate text-xs text-zinc-400">
                      {suggestion.region}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
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
