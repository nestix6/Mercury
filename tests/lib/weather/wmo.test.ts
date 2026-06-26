import { describe, expect, it } from "vitest";
import { wmoToCondition } from "@/lib/weather/wmo";

describe("wmoToCondition", () => {
  it("maps representative codes to our condition shape", () => {
    expect(wmoToCondition(0)).toEqual({ code: "clear", label: "Clear sky" });
    expect(wmoToCondition(2)).toEqual({
      code: "partly-cloudy",
      label: "Partly cloudy",
    });
    expect(wmoToCondition(61)).toEqual({ code: "rain", label: "Light rain" });
    expect(wmoToCondition(95)).toEqual({
      code: "thunderstorm",
      label: "Thunderstorm",
    });
  });

  it("falls back to cloudy for unmapped codes", () => {
    expect(wmoToCondition(100)).toEqual({ code: "cloudy", label: "Cloudy" });
    expect(wmoToCondition(-1)).toEqual({ code: "cloudy", label: "Cloudy" });
  });
});
