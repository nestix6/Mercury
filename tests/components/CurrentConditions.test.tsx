import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("hides the bookmark control unless a handler is given", () => {
    render(
      <CurrentConditions current={current} location={location} units="metric" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the bookmark toggle and fires the handler", () => {
    const onToggleBookmark = vi.fn();
    render(
      <CurrentConditions
        current={current}
        location={location}
        units="metric"
        isBookmarked={false}
        onToggleBookmark={onToggleBookmark}
      />,
    );

    const button = screen.getByRole("button", { name: "Save location" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onToggleBookmark).toHaveBeenCalledOnce();
  });

  it("reflects the saved state", () => {
    render(
      <CurrentConditions
        current={current}
        location={location}
        units="metric"
        isBookmarked
        onToggleBookmark={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Remove bookmark" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
