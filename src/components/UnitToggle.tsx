"use client";

import type { Units } from "@/lib/weather/types";

interface Props {
  value: Units;
  onChange: (units: Units) => void;
}

const OPTIONS: { value: Units; label: string }[] = [
  { value: "metric", label: "°C" },
  { value: "imperial", label: "°F" },
];

/** Segmented °C / °F control. Conversion happens at render via `lib/format`. */
export function UnitToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Temperature units"
      className="glass flex shrink-0 items-center gap-1 rounded-full p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
