import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HourlyStrip } from "@/components/HourlyStrip";
import { MOCK_WEATHER } from "@/lib/weather/mock";

const { hourly } = MOCK_WEATHER;

describe("HourlyStrip", () => {
  it("labels the first tile 'Now' and renders one tile per hour", () => {
    render(<HourlyStrip hours={hourly} units="metric" />);

    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(hourly.length);
  });

  it("exposes a keyboard-operable scroller", () => {
    render(<HourlyStrip hours={hourly} units="metric" />);

    const scroller = screen.getByRole("list", {
      name: /use the arrow keys to scroll/i,
    });
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  describe("keyboard scrolling", () => {
    // jsdom implements neither of these; the handler reads matchMedia and calls
    // scrollBy, so stub both to observe the interaction.
    beforeEach(() => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
      }) as unknown as typeof window.matchMedia;
      Element.prototype.scrollBy = vi.fn();
      Element.prototype.scrollTo = vi.fn();
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("scrolls right on ArrowRight", () => {
      render(<HourlyStrip hours={hourly} units="metric" />);
      const scroller = screen.getByRole("list", {
        name: /use the arrow keys to scroll/i,
      });

      fireEvent.keyDown(scroller, { key: "ArrowRight" });

      expect(scroller.scrollBy).toHaveBeenCalledWith(
        expect.objectContaining({ left: expect.any(Number) }),
      );
      const [{ left }] = (scroller.scrollBy as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(left).toBeGreaterThan(0);
    });
  });
});
