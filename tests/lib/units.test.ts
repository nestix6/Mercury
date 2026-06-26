import { describe, expect, it } from "vitest";
import { parseUnits } from "@/lib/units";

describe("parseUnits", () => {
  it("passes valid units through", () => {
    expect(parseUnits("metric")).toBe("metric");
    expect(parseUnits("imperial")).toBe("imperial");
  });

  it("returns undefined for anything else", () => {
    expect(parseUnits(undefined)).toBeUndefined();
    expect(parseUnits(null)).toBeUndefined();
    expect(parseUnits("")).toBeUndefined();
    expect(parseUnits("METRIC")).toBeUndefined(); // case-sensitive
    expect(parseUnits("kelvin")).toBeUndefined();
  });
});
