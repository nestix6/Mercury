"use client";

import { useRef } from "react";
import { Drop } from "@phosphor-icons/react";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatTemp } from "@/lib/format";
import type { HourForecast, Units } from "@/lib/weather/types";

interface Props {
  hours: HourForecast[];
  units: Units;
}

export function HourlyStrip({ hours, units }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);

  // The strip scrolls horizontally, so it needs to be keyboard-operable on its
  // own: it's focusable (tabIndex) and Arrow/Home/End move it by roughly one
  // tile. Smooth scroll is dropped under reduced-motion.
  function handleKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const el = scrollerRef.current;
    if (!el) return;

    const tile = el.querySelector("li");
    const gap = 8; // matches gap-2
    const step = tile ? tile.clientWidth + gap : 80;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        el.scrollBy({ left: step, behavior });
        break;
      case "ArrowLeft":
        event.preventDefault();
        el.scrollBy({ left: -step, behavior });
        break;
      case "Home":
        event.preventDefault();
        el.scrollTo({ left: 0, behavior });
        break;
      case "End":
        event.preventDefault();
        el.scrollTo({ left: el.scrollWidth, behavior });
        break;
    }
  }

  return (
    <section className="animate-rise [animation-delay:240ms]">
      <h2 className="mb-3 text-sm font-medium text-zinc-400">Hourly forecast</h2>
      <div className="glass-panel rounded-3xl p-3">
        <ul
          ref={scrollerRef}
          tabIndex={0}
          aria-label="Hourly forecast — use the arrow keys to scroll"
          onKeyDown={handleKeyDown}
          className="flex gap-2 overflow-x-auto rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {hours.map((hour, index) => {
            const isNow = index === 0;
            return (
              <li
                key={`${hour.label}-${index}`}
                className={`flex min-w-16 shrink-0 snap-start flex-col items-center gap-3 rounded-2xl px-3 py-4 transition-colors ${
                  isNow ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isNow ? "text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  {hour.label}
                </span>
                <WeatherIcon
                  code={hour.condition.code}
                  isDay={hour.isDay}
                  className="size-6 text-zinc-200"
                  aria-label={hour.condition.label}
                />
                <span className="flex min-h-4 items-center gap-0.5 text-[11px] text-zinc-400">
                  {hour.precipitation >= 20 ? (
                    <>
                      <Drop
                        weight="fill"
                        className="size-3"
                        aria-hidden="true"
                      />
                      {hour.precipitation}%
                    </>
                  ) : null}
                </span>
                <span className="font-mono text-sm text-zinc-100">
                  {formatTemp(hour.temperature, units)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
