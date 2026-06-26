# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. Weather data comes from [Open-Meteo](https://open-meteo.com/).

## What it does

- **Search any place, disambiguated.** The search box is a debounced autocomplete: as you type it lists candidate places, so "Paris" or "Springfield" resolve to the exact one you mean instead of a best guess.
- **Use my location.** A permission-gated "use my location" button (and a one-time prompt on a first visit) loads the forecast for where you are; coordinates are reverse-geocoded to a city name. Denied or unavailable location degrades gracefully with an inline hint.
- **Remembers where you were.** A return visit restores your last location instead of re-prompting or defaulting back to Prague.
- **The forecast.** Current conditions (with feels-like and high/low), an 8-tile conditions grid, a keyboard-scrollable 24-hour strip, and a 7-day forecast — over a floating liquid-glass UI.
- **°C / °F, persisted.** The unit toggle converts live and remembers your choice, read server-side so the first paint already shows the right unit (no flash).
- **Honest when data is missing.** If Open-Meteo is unreachable or a place isn't found, the view falls back to a sample snapshot behind a clear disclaimer, so it's never mistaken for real conditions.
- **Calm, accessible, responsive.** A dark, theme-locked UI with an animated liquid-mercury WebGL landing; keyboard-operable controls with visible focus, full `prefers-reduced-motion` / `prefers-reduced-transparency` fallbacks, and a layout that reflows cleanly from desktop down to mobile.

## Code structure

```
src/
├─ app/
│  ├─ layout.tsx          # root layout: fonts, metadata, dark theme lock
│  ├─ page.tsx            # landing (Server Component)
│  ├─ not-found.tsx       # custom 404 (Server Component)
│  ├─ globals.css         # Tailwind v4, theme tokens, glass + focus utilities
│  ├─ icon.png            # favicon
│  └─ weather/
│     ├─ page.tsx         # Server Component: live fetch (?q / ?lat&lon / remembered) → WeatherView
│     └─ loading.tsx      # route-level skeleton
├─ components/
│  ├─ MercuryField.tsx    # "use client" mercury background (landing)
│  ├─ MercuryBlob.tsx     # "use client" mercury background (404)
│  ├─ mercury-shaders.ts  # WebGL fragment shaders (FRAG_FIELD, FRAG_BLOB)
│  ├─ WeatherView.tsx     # "use client" weather shell (units/search/geolocation)
│  ├─ CurrentConditions.tsx, DetailsGrid.tsx, DailyForecast.tsx   # presentational
│  ├─ HourlyStrip.tsx     # "use client" keyboard-scrollable hourly strip
│  ├─ LocationSearch.tsx  # "use client" search combobox with autocomplete
│  ├─ UnitToggle.tsx      # "use client" °C/°F toggle
│  └─ WeatherIcon.tsx     # condition → Phosphor glyph
├─ lib/
│  ├─ weather/
│  │  ├─ index.ts         # public interface (getWeatherByQuery / ByCoords, searchSuggestions)
│  │  ├─ provider.ts      # Open-Meteo adapter: fetch + normalize into our types
│  │  ├─ actions.ts       # "use server" search-suggestion boundary
│  │  ├─ wmo.ts           # WMO weather code → normalized condition
│  │  ├─ types.ts         # normalized weather model
│  │  └─ mock.ts          # sample snapshot (graceful fallback)
│  ├─ geo/
│  │  └─ reverse.ts       # coords → place name (BigDataCloud), cached + rate-limited
│  ├─ outbound.ts         # shared cachedFetch + multi-window rate limiter (all APIs)
│  ├─ format.ts           # temp/wind/visibility/pressure + unit conversion
│  ├─ units.ts            # unit cookie name + parser (shared by server + client)
│  └─ location-store.ts   # remembered-location cookies (parse/serialize/write)
└─ hooks/
   ├─ useMercuryCanvas.ts  # shared WebGL setup the backgrounds consume
   ├─ useGeolocation.ts    # permission-gated browser geolocation
   ├─ useUnits.ts          # cookie-persisted °C/°F choice
   └─ useLocationSearch.ts # debounced search autocomplete

tests/                     # Vitest (jsdom): mirrors src/ — pure-logic units,
                           # the provider adapter, the useGeolocation flow,
                           # and component tests of the forecast views
```

## Develop

```bash
npm run dev      # dev server (Turbopack) → http://localhost:3000
npm run build    # production build
npm run lint     # ESLint (core-web-vitals + typescript)
npm test         # Vitest (one run); npm run test:watch to watch
```

## Learn more

- **How it works, phase by phase:** [`docs/documentation.md`](docs/documentation.md)
- **Architecture & conventions:** [`AGENTS.md`](AGENTS.md)
