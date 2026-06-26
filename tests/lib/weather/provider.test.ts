import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the network boundary only: `cachedFetch` returns our fixtures, while the
// limiter helpers stay real. Everything between (normalize, compass, time
// slicing, region labelling) is exercised through the public adapter API.
vi.mock("@/lib/outbound", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/outbound")>();
  return { ...actual, cachedFetch: vi.fn() };
});

import { cachedFetch } from "@/lib/outbound";
import {
  getWeatherByCoords,
  getWeatherByQuery,
} from "@/lib/weather/provider";

const mockFetch = vi.mocked(cachedFetch);

// A fixture in Open-Meteo's JSON shape. Hourly arrays start at local midnight;
// "now" is 14:00 so the aligned strip should begin at index 14.
function forecastFixture() {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? "2026-06-26" : "2026-06-27";
    const h = i % 24;
    return `${day}T${String(h).padStart(2, "0")}:00`;
  });
  return {
    timezone: "Europe/Prague",
    current: {
      time: "2026-06-26T14:00",
      temperature_2m: 22.3,
      apparent_temperature: 21.1,
      relative_humidity_2m: 58.4,
      weather_code: 2,
      wind_speed_10m: 13,
      wind_direction_10m: 315, // -> "NW"
      surface_pressure: 990,
      pressure_msl: 1018,
      is_day: 1,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 20),
      weather_code: hours.map(() => 2),
      precipitation_probability: hours.map(() => 10),
      is_day: hours.map((_, i) => (i % 24 >= 6 && i % 24 < 21 ? 1 : 0)),
      visibility: hours.map(() => 16000), // metres -> 16 km
      uv_index: hours.map(() => 4.6),
    },
    daily: {
      time: ["2026-06-26", "2026-06-27", "2026-06-28"],
      weather_code: [2, 61, 0],
      temperature_2m_max: [26, 21, 27],
      temperature_2m_min: [14, 13, 15],
      precipitation_probability_max: [30, 70, 5],
      sunrise: ["2026-06-26T04:53", "2026-06-27T04:54", "2026-06-28T04:54"],
      sunset: ["2026-06-26T21:13", "2026-06-27T21:13", "2026-06-28T21:12"],
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-26T14:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  mockFetch.mockReset();
});

describe("getWeatherByCoords", () => {
  it("normalizes the forecast response into our snapshot", async () => {
    mockFetch.mockResolvedValueOnce(forecastFixture());

    const snap = await getWeatherByCoords(50.09, 14.42, {
      name: "Prague",
      region: "Czechia",
    });

    // Location + label.
    expect(snap.location.name).toBe("Prague");
    expect(snap.location.region).toBe("Czechia");
    expect(snap.location.latitude).toBe(50.09);
    expect(snap.location.longitude).toBe(14.42);

    // Current conditions.
    expect(snap.current.temperature).toBe(22.3);
    expect(snap.current.feelsLike).toBe(21.1);
    expect(snap.current.condition).toEqual({
      code: "partly-cloudy",
      label: "Partly cloudy",
    });
    expect(snap.current.windDirection).toBe("NW");
    expect(snap.current.humidity).toBe(58); // rounded
    expect(snap.current.uvIndex).toBe(5); // 4.6 rounded
    expect(snap.current.visibility).toBe(16); // 16000 m -> km
    expect(snap.current.pressure).toBe(1018); // prefers pressure_msl
    expect(snap.current.isDay).toBe(true);
    expect(snap.current.high).toBe(26);
    expect(snap.current.low).toBe(14);
    expect(snap.current.sunrise).toBe("04:53");
    expect(snap.current.sunset).toBe("21:13");

    // Hourly is aligned to the current hour (14:00).
    expect(snap.hourly).toHaveLength(24);
    expect(snap.hourly[0].label).toBe("Now");
    expect(snap.hourly[1].label).toBe("15:00");

    // Daily: 7 requested, fixture has 3; first is "Today".
    expect(snap.daily[0].label).toBe("Today");
    expect(snap.daily[1].label).toBe("Sat"); // 2026-06-27
    expect(snap.daily[1].condition.code).toBe("rain");
    expect(snap.daily[0].date).toBe("26 Jun");
  });

  it("falls back to a generic label + timezone when none is given", async () => {
    mockFetch.mockResolvedValueOnce(forecastFixture());

    const snap = await getWeatherByCoords(50.09, 14.42);

    expect(snap.location.name).toBe("My location");
    expect(snap.location.region).toBe("Europe/Prague");
  });
});

describe("getWeatherByQuery", () => {
  it("geocodes then normalizes, labelling from the geocoding hit", async () => {
    // First call = geocoding, second = forecast.
    mockFetch
      .mockResolvedValueOnce({
        results: [
          {
            id: 1,
            name: "Prague",
            latitude: 50.09,
            longitude: 14.42,
            country: "Czechia",
            admin1: "Prague",
          },
        ],
      })
      .mockResolvedValueOnce(forecastFixture());

    const snap = await getWeatherByQuery("prague");

    expect(snap).not.toBeNull();
    expect(snap!.location.name).toBe("Prague");
    // admin1 echoes the city name, so describeRegion drops it -> just country.
    expect(snap!.location.region).toBe("Czechia");
  });

  it("returns null when geocoding finds no place", async () => {
    mockFetch.mockResolvedValueOnce({ results: [] });

    expect(await getWeatherByQuery("nowhere-xyz")).toBeNull();
  });
});
