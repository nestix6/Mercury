import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BOOKMARKS_KEY } from "@/lib/bookmark-store";
import type { StoredPlace } from "@/lib/location-store";

const PRAGUE: StoredPlace = {
  lat: 50.09,
  lon: 14.42,
  name: "Prague",
  region: "Czechia",
};
const LONDON: StoredPlace = {
  lat: 51.51,
  lon: -0.13,
  name: "London",
  region: "United Kingdom",
};

describe("useBookmarks", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hydrates from existing storage on mount", () => {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([PRAGUE]));
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.bookmarks).toEqual([PRAGUE]);
    expect(result.current.has(PRAGUE)).toBe(true);
  });

  it("toggles a place on and off and persists", () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.toggle(PRAGUE));
    expect(result.current.bookmarks).toEqual([PRAGUE]);
    expect(JSON.parse(window.localStorage.getItem(BOOKMARKS_KEY)!)).toEqual([
      PRAGUE,
    ]);

    act(() => result.current.toggle(PRAGUE));
    expect(result.current.bookmarks).toEqual([]);
  });

  it("does not duplicate a place within the same grid cell", () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => result.current.toggle(PRAGUE));
    // A near-identical coord toggles the existing entry off, not a second add.
    act(() => result.current.toggle({ ...PRAGUE, lat: 50.0904 }));
    expect(result.current.bookmarks).toEqual([]);
  });

  it("removes a place by key", () => {
    window.localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify([PRAGUE, LONDON]),
    );
    const { result } = renderHook(() => useBookmarks());

    act(() => result.current.remove("50.090,14.420"));
    expect(result.current.bookmarks).toEqual([LONDON]);
  });
});
