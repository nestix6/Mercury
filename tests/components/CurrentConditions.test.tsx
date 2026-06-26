import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrentConditions } from "@/components/CurrentConditions";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const { current, location } = MOCK_WEATHER;

describe("CurrentConditions", () => {
  it("shows the place, time, and condition", () => {
    render(
      <CurrentConditions current={current} location={location} units="metric" />,
    );

    expect(screen.getByText("Prague, Czechia")).toBeInTheDocument();
    expect(screen.getByText(location.localTime)).toBeInTheDocument();
    expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  });

  it("renders metric temperatures", () => {
    render(
      <CurrentConditions current={current} location={location} units="metric" />,
    );

    expect(screen.getByText("22°")).toBeInTheDocument(); // temperature
    expect(screen.getByText("Feels like 21°")).toBeInTheDocument();
    expect(screen.getByText("H 26°")).toBeInTheDocument();
    expect(screen.getByText("L 14°")).toBeInTheDocument();
  });

  it("converts to imperial", () => {
    render(
      <CurrentConditions
        current={current}
        location={location}
        units="imperial"
      />,
    );

    expect(screen.getByText("72°")).toBeInTheDocument(); // 22°C -> 71.6 -> 72
    expect(screen.getByText("Feels like 70°")).toBeInTheDocument(); // 21°C -> 69.8 -> 70
  });
});
