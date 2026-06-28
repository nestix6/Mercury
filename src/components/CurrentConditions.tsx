import { Bookmark, MapPin } from "@phosphor-icons/react";
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
  /** Whether this location is saved. Omit to hide the bookmark control. */
  isBookmarked?: boolean;
  /** Save/unsave this location. Omit to hide the bookmark control. */
  onToggleBookmark?: () => void;
}

export function CurrentConditions({
  current,
  location,
  units,
  isBookmarked,
  onToggleBookmark,
}: Props) {
  return (
    <section className="animate-rise [animation-delay:80ms]">
      <div className="flex items-center gap-2 text-zinc-400">
        <MapPin weight="light" className="size-4" aria-hidden="true" />
        <span className="text-sm font-medium tracking-wide text-zinc-200">
          {location.name}, {location.region}
        </span>
        {onToggleBookmark ? (
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? "Remove bookmark" : "Save location"}
            title={isBookmarked ? "Remove bookmark" : "Save location"}
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 active:scale-95"
          >
            <Bookmark
              weight={isBookmarked ? "fill" : "light"}
              className={`size-4 ${isBookmarked ? "text-zinc-100" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-zinc-500">{location.localTime}</p>

      <div className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-6">
        {/* Icon + temperature stay on one row even on the narrowest phones. */}
        <div className="flex items-center gap-4 sm:gap-8">
          <WeatherIcon
            code={current.condition.code}
            isDay={current.isDay}
            className="size-20 shrink-0 text-zinc-100/90 sm:size-28"
            aria-hidden="true"
          />

          <div className="flex items-end">
            <span className="text-chrome text-7xl leading-[0.85] font-semibold tracking-tight sm:text-9xl">
              {formatTemp(current.temperature, units)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xl font-medium text-zinc-100 sm:text-2xl">
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
