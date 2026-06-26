import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyForecast } from "@/components/DailyForecast";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const { daily } = MOCK_WEATHER;

describe("DailyForecast", () => {
  it("renders one row per day, with today first and weekday labels", () => {
    render(<DailyForecast days={daily} units="metric" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(daily.length); // 7
    expect(screen.getByText("Today")).toBeInTheDocument();
    for (const label of ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows each day's high and low", () => {
    render(<DailyForecast days={daily} units="metric" />);

    // Today: high 26 / low 14.
    expect(screen.getByText("26°")).toBeInTheDocument();
    expect(screen.getByText("14°")).toBeInTheDocument();
  });

  it("shows precipitation only at or above 20%", () => {
    render(<DailyForecast days={daily} units="metric" />);

    expect(screen.getByText("70%")).toBeInTheDocument(); // Thu
    expect(screen.getByText("30%")).toBeInTheDocument(); // Today
    // Sun (10%), Mon (5%), Tue (0%) stay hidden.
    expect(screen.queryByText("10%")).not.toBeInTheDocument();
    expect(screen.queryByText("5%")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
