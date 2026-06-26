import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsGrid } from "@/components/DetailsGrid";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const { current } = MOCK_WEATHER;

describe("DetailsGrid", () => {
  it("renders all eight stat tiles", () => {
    render(<DetailsGrid current={current} units="metric" />);

    for (const label of [
      "Feels like",
      "Wind",
      "Humidity",
      "UV index",
      "Visibility",
      "Pressure",
      "Sunrise",
      "Sunset",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows metric values and descriptors", () => {
    render(<DetailsGrid current={current} units="metric" />);

    expect(screen.getByText("58%")).toBeInTheDocument(); // humidity
    expect(screen.getByText("13 km/h")).toBeInTheDocument(); // wind
    expect(screen.getByText("From NW")).toBeInTheDocument(); // wind direction
    expect(screen.getByText("5")).toBeInTheDocument(); // UV index value
    expect(screen.getByText("Moderate")).toBeInTheDocument(); // UV descriptor
    expect(screen.getByText("04:53")).toBeInTheDocument(); // sunrise
  });

  it("converts values to imperial", () => {
    render(<DetailsGrid current={current} units="imperial" />);

    expect(screen.getByText("8 mph")).toBeInTheDocument(); // 13 km/h -> 8.07 -> 8
    expect(screen.getByText("10 mi")).toBeInTheDocument(); // 16 km -> 9.94 -> 10
    expect(screen.getByText("30.06 inHg")).toBeInTheDocument(); // 1018 hPa
  });
});
