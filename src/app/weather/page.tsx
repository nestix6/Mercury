import type { Metadata } from "next";
import { WeatherView } from "@/components/WeatherView";
import { MOCK_WEATHER } from "@/lib/weather/mock";

export const metadata: Metadata = {
  title: "Prague · Mercury",
  description:
    "Current conditions, an hourly view, and a seven-day forecast. Fast, calm, and accurate.",
};

// Server Component: builds the normalized snapshot and hands it to the client
// view. For now that snapshot is mock data; Phase 1 swaps in the Open-Meteo
// adapter (cached + revalidated) without changing this component's shape.
export default function WeatherPage() {
  return <WeatherView data={MOCK_WEATHER} />;
}
