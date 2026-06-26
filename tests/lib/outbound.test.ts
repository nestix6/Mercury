import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLimiter, HOUR, MINUTE } from "@/lib/outbound";

describe("createLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit, then rejects within the window", () => {
    const allow = createLimiter([{ limit: 3, windowMs: MINUTE }]);
    expect(allow()).toBe(true);
    expect(allow()).toBe(true);
    expect(allow()).toBe(true);
    expect(allow()).toBe(false);
  });

  it("rejects when any single window is exhausted", () => {
    // 2/min but 10/hour: the minute window trips first.
    const allow = createLimiter([
      { limit: 2, windowMs: MINUTE },
      { limit: 10, windowMs: HOUR },
    ]);
    expect(allow()).toBe(true);
    expect(allow()).toBe(true);
    expect(allow()).toBe(false);
  });

  it("does not charge windows when rejecting", () => {
    // Minute spent but hour has room; after the minute resets, the hour budget
    // should still have only counted the calls that were actually allowed.
    const allow = createLimiter([
      { limit: 2, windowMs: MINUTE },
      { limit: 3, windowMs: HOUR },
    ]);
    expect(allow()).toBe(true);
    expect(allow()).toBe(true);
    expect(allow()).toBe(false); // minute spent, not charged
    vi.advanceTimersByTime(MINUTE);
    expect(allow()).toBe(true); // 3rd hourly call -> hour now spent
    expect(allow()).toBe(false); // hour budget exhausted
  });

  it("resets a window once its duration elapses", () => {
    const allow = createLimiter([{ limit: 1, windowMs: MINUTE }]);
    expect(allow()).toBe(true);
    expect(allow()).toBe(false);
    vi.advanceTimersByTime(MINUTE);
    expect(allow()).toBe(true);
  });

  it("always rejects with a zero limit", () => {
    const allow = createLimiter([{ limit: 0, windowMs: MINUTE }]);
    expect(allow()).toBe(false);
    expect(allow()).toBe(false);
  });
});
