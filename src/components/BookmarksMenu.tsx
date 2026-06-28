"use client";

import { useId, useRef, useState } from "react";
import { Bookmark, X } from "@phosphor-icons/react";
import { placeKey } from "@/lib/bookmark-store";
import type { StoredPlace } from "@/lib/location-store";

interface Props {
  /** Saved places (owned by the parent via `useBookmarks`). */
  bookmarks: StoredPlace[];
  /** Navigate to a saved place. */
  onSelect: (place: StoredPlace) => void;
  /** Remove a saved place by its `placeKey`. */
  onRemove: (key: string) => void;
}

/**
 * The "Saved" dropdown in the nav. A bookmark button opens a `glass-dark` panel
 * listing saved places (styled like the search suggestions); clicking a row
 * navigates to it, and a per-row × removes it. Mirrors the ARIA/keyboard and
 * blur-delay patterns in `LocationSearch`.
 */
export function BookmarksMenu({ bookmarks, onSelect, onRemove }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    setOpen(false);
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        // Close only when focus leaves the whole menu (not row-to-row).
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          blurTimer.current = setTimeout(close, 120);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Saved locations"
        title="Saved locations"
        className="glass flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-zinc-100 active:scale-[0.97]"
      >
        <Bookmark weight="light" className="size-5" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Saved locations"
          className="glass-dark absolute top-full right-0 z-40 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl p-1.5"
        >
          {bookmarks.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-400">
              No saved places yet.
            </li>
          ) : (
            bookmarks.map((place) => {
              const key = placeKey(place);
              return (
                <li
                  key={key}
                  role="option"
                  aria-selected={false}
                  className="flex items-center gap-1 rounded-xl pr-1 transition-colors hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      close();
                      onSelect(place);
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2 text-left"
                  >
                    <span className="truncate text-sm font-medium text-zinc-100">
                      {place.name}
                    </span>
                    {place.region ? (
                      <span className="truncate text-xs text-zinc-400">
                        {place.region}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      onRemove(key);
                    }}
                    aria-label={`Remove ${place.name}`}
                    title="Remove"
                    className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
                  >
                    <X weight="bold" className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
