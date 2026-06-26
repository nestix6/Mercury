import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGeolocation } from "@/hooks/useGeolocation";

// PERMISSION_DENIED in the spec is 1; the others (2/3) are POSITION_UNAVAILABLE
// and TIMEOUT. The hook only special-cases PERMISSION_DENIED, so a minimal
// GeolocationPositionError-shaped object is enough.
function geoError(code: number): GeolocationPositionError {
  return {
    code,
    message: "",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

/** Install a fake `navigator.geolocation` whose getCurrentPosition we control. */
function mockGeolocation(getCurrentPosition: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition },
  });
}

describe("useGeolocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe("idle");
  });

  it("reports 'unavailable' when the Geolocation API is missing", () => {
    vi.stubGlobal("navigator", {});
    const onLocated = vi.fn();

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate(onLocated));

    expect(result.current.status).toBe("unavailable");
    expect(onLocated).not.toHaveBeenCalled();
  });

  it("sets 'locating' while the request is in flight", () => {
    // getCurrentPosition that never resolves (no callback invoked).
    mockGeolocation(vi.fn());
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.locate(vi.fn()));

    expect(result.current.status).toBe("locating");
  });

  it("on success returns to idle and forwards the coords", () => {
    const getCurrentPosition = vi.fn((onSuccess) =>
      onSuccess({ coords: { latitude: 50.08, longitude: 14.42 } }),
    );
    mockGeolocation(getCurrentPosition);
    const onLocated = vi.fn();

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate(onLocated));

    expect(result.current.status).toBe("idle");
    expect(onLocated).toHaveBeenCalledWith({
      latitude: 50.08,
      longitude: 14.42,
    });
  });

  it("maps a permission-denied error to 'denied' and skips the callback", () => {
    const getCurrentPosition = vi.fn((_onSuccess, onError) =>
      onError(geoError(1)),
    );
    mockGeolocation(getCurrentPosition);
    const onLocated = vi.fn();

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate(onLocated));

    expect(result.current.status).toBe("denied");
    expect(onLocated).not.toHaveBeenCalled();
  });

  it("maps any other error to 'error'", () => {
    const getCurrentPosition = vi.fn((_onSuccess, onError) =>
      onError(geoError(2)),
    );
    mockGeolocation(getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate(vi.fn()));

    expect(result.current.status).toBe("error");
  });

  it("passes a high-accuracy, timed-out options object to the browser API", () => {
    const getCurrentPosition = vi.fn();
    mockGeolocation(getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.locate(vi.fn()));

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true, timeout: 10_000 }),
    );
  });
});
