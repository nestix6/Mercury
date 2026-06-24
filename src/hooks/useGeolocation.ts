"use client";

import { useCallback, useState } from "react";

export type GeoStatus =
  | "idle"
  | "locating"
  | "denied"
  | "unavailable"
  | "error";

export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Thin wrapper over the browser Geolocation API. Permission-gated and
 * client-only: `locate` triggers the native prompt and reports back through
 * `status` so the UI can degrade gracefully (granted / denied / unavailable).
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>("idle");

  const locate = useCallback((onLocated: (coords: Coords) => void) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("idle");
        onLocated({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }, []);

  return { status, locate };
}
