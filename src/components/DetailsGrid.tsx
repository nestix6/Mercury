import {
  Drop,
  Eye,
  Gauge,
  Sun,
  SunDim,
  SunHorizon,
  Thermometer,
  Wind,
  type Icon,
} from "@phosphor-icons/react";
import {
  formatPressure,
  formatTemp,
  formatVisibility,
  formatWind,
  uvDescriptor,
} from "@/lib/format";
import type { CurrentConditions, Units } from "@/lib/weather/types";

interface Props {
  current: CurrentConditions;
  units: Units;
}

interface Stat {
  icon: Icon;
  label: string;
  value: string;
  detail?: string;
}

export function DetailsGrid({ current, units }: Props) {
  const stats: Stat[] = [
    {
      icon: Thermometer,
      label: "Feels like",
      value: formatTemp(current.feelsLike, units),
    },
    {
      icon: Wind,
      label: "Wind",
      value: formatWind(current.windSpeed, units),
      detail: `From ${current.windDirection}`,
    },
    {
      icon: Drop,
      label: "Humidity",
      value: `${current.humidity}%`,
    },
    {
      icon: Sun,
      label: "UV index",
      value: String(current.uvIndex),
      detail: uvDescriptor(current.uvIndex),
    },
    {
      icon: Eye,
      label: "Visibility",
      value: formatVisibility(current.visibility, units),
    },
    {
      icon: Gauge,
      label: "Pressure",
      value: formatPressure(current.pressure, units),
    },
    {
      icon: SunHorizon,
      label: "Sunrise",
      value: current.sunrise,
    },
    {
      icon: SunDim,
      label: "Sunset",
      value: current.sunset,
    },
  ];

  return (
    <section className="animate-rise [animation-delay:160ms]">
      <h2 className="mb-3 text-sm font-medium text-zinc-400">Conditions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Glyph, label, value, detail }) => (
          <div
            key={label}
            className="glass-panel glass-interactive flex flex-col gap-3 rounded-3xl p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <Glyph weight="light" className="size-4" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="mt-auto">
              <p className="font-mono text-xl text-zinc-100 sm:text-2xl">
                {value}
              </p>
              {detail ? (
                <p className="mt-0.5 text-xs text-zinc-400">{detail}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
