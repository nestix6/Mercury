import { Drop } from "@phosphor-icons/react";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatTempValue } from "@/lib/format";
import type { DayForecast, Units } from "@/lib/weather/types";

interface Props {
  days: DayForecast[];
  units: Units;
}

export function DailyForecast({ days, units }: Props) {
  // Map each day's low/high onto the week's overall span so the bars share a scale.
  const weekLow = Math.min(...days.map((d) => d.low));
  const weekHigh = Math.max(...days.map((d) => d.high));
  const span = Math.max(weekHigh - weekLow, 1);

  return (
    <section className="animate-rise [animation-delay:320ms]">
      <h2 className="mb-3 text-sm font-medium text-zinc-400">7-day forecast</h2>
      <div className="glass-panel rounded-3xl p-2 sm:p-3">
        <ul>
          {days.map((day) => {
            const left = ((day.low - weekLow) / span) * 100;
            const width = ((day.high - day.low) / span) * 100;

            return (
              <li
                key={day.date}
                className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-white/[0.04] sm:px-3"
              >
                <div className="w-14 shrink-0">
                  <p
                    className={`text-sm font-medium ${
                      day.label === "Today" ? "text-zinc-100" : "text-zinc-300"
                    }`}
                  >
                    {day.label}
                  </p>
                </div>

                <WeatherIcon
                  code={day.condition.code}
                  className="size-6 shrink-0 text-zinc-200"
                  aria-label={day.condition.label}
                />

                <span className="flex w-12 shrink-0 items-center gap-0.5 text-xs text-zinc-400">
                  {day.precipitation >= 20 ? (
                    <>
                      <Drop weight="fill" className="size-3" aria-hidden="true" />
                      {day.precipitation}%
                    </>
                  ) : null}
                </span>

                <div className="flex flex-1 items-center justify-end gap-3">
                  <span className="w-9 shrink-0 text-right font-mono text-sm text-zinc-500">
                    {formatTempValue(day.low, units)}°
                  </span>
                  <div className="relative h-1.5 w-full max-w-[12rem] flex-1 rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-zinc-500 to-zinc-100"
                      style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 font-mono text-sm text-zinc-100">
                    {formatTempValue(day.high, units)}°
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
