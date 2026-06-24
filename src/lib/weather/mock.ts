/**
 * Sample weather snapshot used as a graceful fallback: the weather page renders
 * this (flagged "sample data") when Open-Meteo errors or a searched place can't
 * be found, so the UI never breaks. Values are made up but internally consistent
 * (Prague, a changeable late-June day). Everything is metric; the UI converts.
 */

import type {
  Condition,
  ConditionCode,
  HourForecast,
  WeatherSnapshot,
} from "@/lib/weather/types";

const LABELS: Record<ConditionCode, string> = {
  clear: "Clear",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  overcast: "Overcast",
  fog: "Fog",
  drizzle: "Drizzle",
  rain: "Light rain",
  snow: "Snow",
  thunderstorm: "Thunderstorm",
  windy: "Windy",
};

function condition(code: ConditionCode): Condition {
  return { code, label: LABELS[code] };
}

// Smooth diurnal temperature curve: peaks ~17:00, troughs ~05:00.
function tempAt(hour: number): number {
  const mid = 19.5;
  const amplitude = 6.5;
  return Math.round(mid + amplitude * Math.cos(((hour - 17) / 12) * Math.PI));
}

function buildHourly(): HourForecast[] {
  const startHour = 14; // "Now"
  const hours: HourForecast[] = [];

  for (let i = 0; i < 24; i++) {
    const h = (startHour + i) % 24;
    const isDay = h >= 5 && h < 21;

    let code: ConditionCode = isDay ? "partly-cloudy" : "clear";
    let precipitation = isDay ? 8 : 2;

    if (h === 6 || h === 7) {
      code = "fog";
      precipitation = 0;
    }
    if (h >= 16 && h <= 18) {
      code = "rain";
      precipitation = h === 17 ? 42 : 30;
    }
    if (h >= 21 || h < 5) {
      code = "clear";
      precipitation = 0;
    }

    hours.push({
      label: i === 0 ? "Now" : `${String(h).padStart(2, "0")}:00`,
      temperature: tempAt(h),
      condition: condition(code),
      precipitation,
      isDay,
    });
  }

  return hours;
}

export const MOCK_WEATHER: WeatherSnapshot = {
  location: {
    name: "Prague",
    region: "Czechia",
    localTime: "Wednesday 24 June, 14:08",
  },
  current: {
    temperature: 22,
    feelsLike: 21,
    condition: condition("partly-cloudy"),
    high: 26,
    low: 14,
    windSpeed: 13,
    windDirection: "NW",
    humidity: 58,
    uvIndex: 5,
    visibility: 16,
    pressure: 1018,
    sunrise: "04:53",
    sunset: "21:13",
    isDay: true,
  },
  hourly: buildHourly(),
  daily: [
    {
      label: "Today",
      date: "24 Jun",
      condition: condition("partly-cloudy"),
      high: 26,
      low: 14,
      precipitation: 30,
    },
    {
      label: "Thu",
      date: "25 Jun",
      condition: condition("rain"),
      high: 21,
      low: 13,
      precipitation: 70,
    },
    {
      label: "Fri",
      date: "26 Jun",
      condition: condition("rain"),
      high: 19,
      low: 12,
      precipitation: 80,
    },
    {
      label: "Sat",
      date: "27 Jun",
      condition: condition("cloudy"),
      high: 23,
      low: 13,
      precipitation: 25,
    },
    {
      label: "Sun",
      date: "28 Jun",
      condition: condition("partly-cloudy"),
      high: 27,
      low: 15,
      precipitation: 10,
    },
    {
      label: "Mon",
      date: "29 Jun",
      condition: condition("clear"),
      high: 29,
      low: 16,
      precipitation: 5,
    },
    {
      label: "Tue",
      date: "30 Jun",
      condition: condition("clear"),
      high: 30,
      low: 17,
      precipitation: 0,
    },
  ],
};
