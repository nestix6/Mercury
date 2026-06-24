# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. Weather data comes from [Open-Meteo](https://open-meteo.com/).

> **Status:** in progress. The marketing **landing** (`/`) and a matching **custom 404** are built (a dark hero with an animated liquid-mercury WebGL background), and the main **weather view** (`/weather`) is built as placeholder UI — current conditions, a conditions grid, an hourly strip, and a 7-day forecast running on normalized types + mock data, with a working °C/°F toggle. Live [Open-Meteo](https://open-meteo.com/) data is next. See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the roadmap and [`AGENTS.md`](AGENTS.md) for architecture and conventions.

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
│     ├─ page.tsx         # Server Component: builds snapshot → WeatherView
│     └─ loading.tsx      # route-level skeleton
├─ components/
│  ├─ MercuryField.tsx    # "use client" mercury background (landing)
│  ├─ MercuryBlob.tsx     # "use client" mercury background (404)
│  ├─ mercury-shaders.ts  # WebGL fragment shaders (FRAG_FIELD, FRAG_BLOB)
│  ├─ WeatherView.tsx     # "use client" weather shell (units/search state)
│  ├─ CurrentConditions.tsx, DetailsGrid.tsx, HourlyStrip.tsx, DailyForecast.tsx
│  ├─ LocationSearch.tsx, UnitToggle.tsx   # interactive client leaves
│  └─ WeatherIcon.tsx     # condition → Phosphor glyph
├─ lib/
│  ├─ weather/
│  │  ├─ types.ts         # normalized weather model
│  │  └─ mock.ts          # placeholder snapshot (drop-in for the real adapter)
│  └─ format.ts           # temp/wind/visibility/pressure + unit conversion
└─ hooks/
   └─ useMercuryCanvas.ts # shared WebGL setup the backgrounds consume
```

Both backgrounds are hand-built WebGL fragment shaders (mercury metaballs). `useMercuryCanvas` holds the plumbing; the two components are thin client leaves. They render at reduced resolution with a capped device-pixel-ratio, honor `prefers-reduced-motion` (single static frame), and fall back to a CSS gradient where WebGL is unavailable. The pages stay Server Components.

The **weather view** (`/weather`) renders current conditions, an 8-tile conditions grid, a 24-hour strip, and a 7-day forecast over a floating liquid-glass UI. It runs on normalized types (`lib/weather/types.ts`) and a mock snapshot (`lib/weather/mock.ts`) for now, with the unit toggle doing live °C/°F conversion. The Server Component page just swaps in the real Open-Meteo adapter later without changing shape.
