"use client";

import { useCallback, useEffect, useState } from "react";
import {
  placeKey,
  readBookmarks,
  writeBookmarks,
} from "@/lib/bookmark-store";
import type { StoredPlace } from "@/lib/location-store";

/**
 * Bookmarks (saved locations), persisted in localStorage via `bookmark-store`.
 *
 * Starts empty and hydrates from storage on mount — localStorage is client-only,
 * so seeding from it during render would mismatch the server-rendered HTML.
 * Every change writes back. Identity/dedup is by rounded coords (`placeKey`), so
 * saving the same place twice is a no-op and `has` reflects the current view.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<StoredPlace[]>([]);

  // Hydrate once on mount (post-render, so SSR and the first client render
  // agree). A single mount-time read, not a synchronizing loop — the rule's
  // cascading-render concern doesn't apply.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookmarks(readBookmarks());
  }, []);

  const persist = useCallback((next: StoredPlace[]) => {
    setBookmarks(next);
    writeBookmarks(next);
  }, []);

  const has = useCallback(
    (place: StoredPlace) => {
      const key = placeKey(place);
      return bookmarks.some((b) => placeKey(b) === key);
    },
    [bookmarks],
  );

  /** Add the place if absent, remove it if already saved. */
  const toggle = useCallback(
    (place: StoredPlace) => {
      const key = placeKey(place);
      const without = bookmarks.filter((b) => placeKey(b) !== key);
      persist(
        without.length === bookmarks.length ? [...bookmarks, place] : without,
      );
    },
    [bookmarks, persist],
  );

  const remove = useCallback(
    (key: string) => {
      persist(bookmarks.filter((b) => placeKey(b) !== key));
    },
    [bookmarks, persist],
  );

  return { bookmarks, has, toggle, remove };
}
