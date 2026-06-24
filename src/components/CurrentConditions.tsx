import { MapPin } from "@phosphor-icons/react";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatTemp } from "@/lib/format";
import type {
  CurrentConditions as Current,
  Units,
  WeatherLocation,
} from "@/lib/weather/types";

interface Props {
  current: Current;
  location: WeatherLocation;
  units: Units;
}

export function CurrentConditions({ current, location, units }: Props) {
  return (
    <section className="animate-rise [animation-delay:80ms]">
      <div className="flex items-center gap-2 text-zinc-400">
        <MapPin weight="light" className="size-4" aria-hidden="true" />
        <span className="text-sm font-medium tracking-wide text-zinc-200">
          {location.name}, {location.region}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{location.localTime}</p>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-6">
        <WeatherIcon
          code={current.condition.code}
          isDay={current.isDay}
          className="size-24 shrink-0 text-zinc-100/90 sm:size-28"
          aria-hidden="true"
        />

        <div className="flex items-end">
          <span className="text-chrome text-8xl leading-[0.85] font-semibold tracking-tight sm:text-9xl">
            {formatTemp(current.temperature, units)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-medium text-zinc-100">
            {current.condition.label}
          </p>
          <p className="text-zinc-400">
            Feels like {formatTemp(current.feelsLike, units)}
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-400">
            <span className="text-zinc-200">
              H {formatTemp(current.high, units)}
            </span>
            <span className="mx-2 text-zinc-600">·</span>
            <span className="text-zinc-200">
              L {formatTemp(current.low, units)}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
