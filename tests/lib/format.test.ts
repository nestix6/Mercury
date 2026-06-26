import { describe, expect, it } from "vitest";
import {
  formatPressure,
  formatTemp,
  formatTempValue,
  formatVisibility,
  formatWind,
  temperatureUnit,
  toFahrenheit,
  uvDescriptor,
} from "@/lib/format";

describe("toFahrenheit", () => {
  it("converts known anchors", () => {
    expect(toFahrenheit(0)).toBe(32);
    expect(toFahrenheit(100)).toBe(212);
    expect(toFahrenheit(-40)).toBe(-40);
  });
});

describe("formatTemp", () => {
  it("rounds and appends a degree sign in metric", () => {
    expect(formatTemp(22, "metric")).toBe("22°");
    expect(formatTemp(22.5, "metric")).toBe("23°"); // round-half-up
  });

  it("converts to Fahrenheit in imperial", () => {
    expect(formatTemp(0, "imperial")).toBe("32°");
    expect(formatTemp(20, "imperial")).toBe("68°");
  });
});

describe("formatTempValue", () => {
  it("returns a bare rounded number per unit", () => {
    expect(formatTempValue(22.5, "metric")).toBe(23);
    expect(formatTempValue(0, "imperial")).toBe(32);
  });
});

describe("temperatureUnit", () => {
  it("labels the active unit", () => {
    expect(temperatureUnit("metric")).toBe("°C");
    expect(temperatureUnit("imperial")).toBe("°F");
  });
});

describe("formatWind", () => {
  it("keeps km/h in metric", () => {
    expect(formatWind(13, "metric")).toBe("13 km/h");
    expect(formatWind(13.6, "metric")).toBe("14 km/h");
  });

  it("converts to mph in imperial", () => {
    expect(formatWind(100, "imperial")).toBe("62 mph"); // 100 * 0.621371 = 62.1
  });
});

describe("formatVisibility", () => {
  it("keeps km in metric", () => {
    expect(formatVisibility(16, "metric")).toBe("16 km");
  });

  it("converts to miles in imperial", () => {
    expect(formatVisibility(10, "imperial")).toBe("6 mi"); // 6.21 -> 6
  });
});

describe("formatPressure", () => {
  it("rounds hPa in metric", () => {
    expect(formatPressure(1018, "metric")).toBe("1018 hPa");
    expect(formatPressure(1013.4, "metric")).toBe("1013 hPa");
  });

  it("renders inHg to two decimals in imperial", () => {
    expect(formatPressure(1018, "imperial")).toBe("30.06 inHg"); // 1018 * 0.02953
  });
});

describe("uvDescriptor", () => {
  it("buckets each band, including boundaries", () => {
    expect(uvDescriptor(0)).toBe("Low");
    expect(uvDescriptor(2)).toBe("Low");
    expect(uvDescriptor(3)).toBe("Moderate");
    expect(uvDescriptor(5)).toBe("Moderate");
    expect(uvDescriptor(6)).toBe("High");
    expect(uvDescriptor(7)).toBe("High");
    expect(uvDescriptor(8)).toBe("Very high");
    expect(uvDescriptor(10)).toBe("Very high");
    expect(uvDescriptor(11)).toBe("Extreme");
  });
});
