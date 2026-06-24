import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";
import type { ConditionCode } from "@/lib/weather/types";

const DAY_ICONS: Record<ConditionCode, Icon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  overcast: Cloud,
  fog: CloudFog,
  drizzle: CloudRain,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
  windy: Wind,
};

// Only the sky-dependent conditions get a night variant.
const NIGHT_ICONS: Partial<Record<ConditionCode, Icon>> = {
  clear: Moon,
  "partly-cloudy": CloudMoon,
};

type WeatherIconProps = IconProps & {
  code: ConditionCode;
  isDay?: boolean;
};

/** Maps a normalized condition (+ day/night) to one Phosphor glyph. */
export function WeatherIcon({ code, isDay = true, ...props }: WeatherIconProps) {
  const Glyph = (!isDay && NIGHT_ICONS[code]) || DAY_ICONS[code];
  return <Glyph weight="light" {...props} />;
}
