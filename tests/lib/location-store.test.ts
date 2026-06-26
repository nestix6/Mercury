import { describe, expect, it } from "vitest";
import {
  parsePlace,
  serializePlace,
  type StoredPlace,
} from "@/lib/location-store";

const PRAGUE: StoredPlace = {
  lat: 50.09,
  lon: 14.42,
  name: "Prague",
  region: "Czechia",
};

describe("serializePlace / parsePlace", () => {
  it("round-trips a stored place", () => {
    expect(parsePlace(serializePlace(PRAGUE))).toEqual(PRAGUE);
  });

  it("returns null for absent or unparseable values", () => {
    expect(parsePlace(null)).toBeNull();
    expect(parsePlace(undefined)).toBeNull();
    expect(parsePlace("")).toBeNull();
    expect(parsePlace("not json")).toBeNull();
  });

  it("rejects objects missing required fields", () => {
    expect(parsePlace(encodeURIComponent("{}"))).toBeNull();
    expect(
      parsePlace(encodeURIComponent(JSON.stringify({ lat: 50, lon: 14 }))),
    ).toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    expect(parsePlace(serializePlace({ ...PRAGUE, lat: 91 }))).toBeNull();
    expect(parsePlace(serializePlace({ ...PRAGUE, lon: 181 }))).toBeNull();
  });

  it("rejects non-finite coordinates", () => {
    // NaN/Infinity serialize to JSON `null`, which fails the number check.
    expect(parsePlace(serializePlace({ ...PRAGUE, lat: NaN }))).toBeNull();
    expect(parsePlace(serializePlace({ ...PRAGUE, lon: Infinity }))).toBeNull();
  });

  it("rejects wrong field types", () => {
    expect(
      parsePlace(
        encodeURIComponent(
          JSON.stringify({ lat: "50", lon: 14, name: "Prague", region: "CZ" }),
        ),
      ),
    ).toBeNull();
    expect(
      parsePlace(
        encodeURIComponent(
          JSON.stringify({ lat: 50, lon: 14, name: 1, region: "CZ" }),
        ),
      ),
    ).toBeNull();
  });
});
