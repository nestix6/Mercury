# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. Weather data comes from [Open-Meteo](https://open-meteo.com/).

> **Status:** in progress. The marketing **landing** (`/`) and a matching **custom 404** are built (a dark hero with an animated liquid-mercury WebGL background), and the main **weather view** (`/weather`) runs on **live [Open-Meteo](https://open-meteo.com/) data** — current conditions, a conditions grid, an hourly strip, and a 7-day forecast, with a **persisted** °C/°F toggle, location search, and "use my location" (with an inline hint when location is denied or unavailable). Still to come: the first tests. See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the roadmap and [`AGENTS.md`](AGENTS.md) for architecture and conventions.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, and [http://localhost:3000/weather](http://localhost:3000/weather) for the forecast view.

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next)
```

## Code structure

```
src/
├─ app/
│  ├─ layout.tsx          # root layout: fonts, metadata, dark theme lock
│  ├─ page.tsx            # landing (Server Component)
│  ├─ not-found.tsx       # custom 404 (Server Component)
│  ├─ globals.css         # Tailwind v4, theme tokens, glass + page utilities
│  ├─ icon.png            # favicon
│  └─ weather/
│     ├─ page.tsx         # Server Component: live fetch (?q / ?lat&lon) → WeatherView
│     └─ loading.tsx      # route-level skeleton
├─ components/
│  ├─ MercuryField.tsx    # "use client" mercury background (landing)
│  ├─ MercuryBlob.tsx     # "use client" mercury background (404)
│  ├─ mercury-shaders.ts  # WebGL fragment shaders (FRAG_FIELD, FRAG_BLOB)
│  ├─ WeatherView.tsx     # "use client" weather shell (units/search/geolocation)
│  ├─ CurrentConditions.tsx, DetailsGrid.tsx, HourlyStrip.tsx, DailyForecast.tsx
│  ├─ LocationSearch.tsx, UnitToggle.tsx   # interactive client leaves
│  └─ WeatherIcon.tsx     # condition → Phosphor glyph
├─ lib/
│  ├─ weather/
│  │  ├─ index.ts         # public interface (getWeatherByQuery / ByCoords, searchLocations)
│  │  ├─ provider.ts      # Open-Meteo adapter: fetch + normalize into our types
│  │  ├─ wmo.ts           # WMO weather code → normalized condition
│  │  ├─ types.ts         # normalized weather model
│  │  └─ mock.ts          # sample snapshot (graceful fallback)
│  ├─ geo/
│  │  └─ reverse.ts       # coords → place name (BigDataCloud), cached + rate-limited
│  ├─ outbound.ts         # shared cachedFetch + multi-window rate limiter (all APIs)
│  ├─ format.ts           # temp/wind/visibility/pressure + unit conversion
│  └─ units.ts            # unit cookie name + parser (shared by server + client)
└─ hooks/
   ├─ useMercuryCanvas.ts # shared WebGL setup the backgrounds consume
   ├─ useGeolocation.ts   # permission-gated browser geolocation
   └─ useUnits.ts         # cookie-persisted °C/°F choice
```

Both backgrounds are hand-built WebGL fragment shaders (mercury metaballs). `useMercuryCanvas` holds the plumbing; the two components are thin client leaves. They render at reduced resolution with a capped device-pixel-ratio, honor `prefers-reduced-motion` (single static frame), and fall back to a CSS gradient where WebGL is unavailable. The pages stay Server Components.

The **weather view** (`/weather`) renders current conditions, an 8-tile conditions grid, a 24-hour strip, and a 7-day forecast over a floating liquid-glass UI. It runs on **live Open-Meteo data** (`lib/weather/`), normalized into our own types so the UI never sees the provider's shape. The Server Component fetches by search query (`?q=`) or coordinates (`?lat&lon`, from "use my location" — coords are reverse-geocoded to a city name via `lib/geo/reverse.ts`), defaulting to Prague. Every outbound call runs through `lib/outbound.ts`, which caches/revalidates, collapses cache keys (rounding coords, normalizing queries), and applies a per-instance rate-limit circuit breaker so unchanged data is served from cache rather than refetched. The unit toggle does live °C/°F conversion and persists the choice in a cookie that the server reads, so a reload keeps your unit with no flash. If the provider is unreachable or a place isn't found, it falls back to a sample snapshot (`lib/weather/mock.ts`) behind a clear disclaimer so it's never mistaken for real data.
