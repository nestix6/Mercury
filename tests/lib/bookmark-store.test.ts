import { afterEach, describe, expect, it } from "vitest";
import {
  BOOKMARKS_KEY,
  placeKey,
  readBookmarks,
  writeBookmarks,
} from "@/lib/bookmark-store";
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

describe("placeKey", () => {
  it("derives a stable rounded-coords key", () => {
    expect(placeKey(PRAGUE)).toBe("50.090,14.420");
  });

  it("collapses places within the 3 dp grid to the same key", () => {
    expect(placeKey({ ...PRAGUE, lat: 50.0904, lon: 14.4203 })).toBe(
      placeKey(PRAGUE),
    );
  });
});

describe("readBookmarks / writeBookmarks", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a list", () => {
    writeBookmarks([PRAGUE, LONDON]);
    expect(readBookmarks()).toEqual([PRAGUE, LONDON]);
  });

  it("returns an empty array when nothing is stored", () => {
    expect(readBookmarks()).toEqual([]);
  });

  it("returns an empty array for malformed storage", () => {
    window.localStorage.setItem(BOOKMARKS_KEY, "not json");
    expect(readBookmarks()).toEqual([]);
  });

  it("ignores a non-array payload", () => {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify({ lat: 1 }));
    expect(readBookmarks()).toEqual([]);
  });

  it("drops invalid entries but keeps valid ones", () => {
    window.localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify([
        PRAGUE,
        { lat: 91, lon: 14, name: "Bad", region: "x" }, // out of range
        { lat: 50, lon: 14, name: 1, region: "x" }, // wrong type
        LONDON,
      ]),
    );
    expect(readBookmarks()).toEqual([PRAGUE, LONDON]);
  });
});
