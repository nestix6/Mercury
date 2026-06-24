# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Priorities: speed, a calm/legible UI, and accurate data.

> **Read `docs/implementation-plan.md` at the start of each session.** It's the source of truth for scope, phases, the data model, and key decisions — this file only summarizes it.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (config-less; PostCSS plugin in `postcss.config.mjs`, theme in `src/app/globals.css`)
- **Data:** native `fetch` + Next caching (`revalidate`) — no SDKs (the `openmeteo` SDK speaks FlatBuffers and bypasses the fetch cache)
- **Provider:** Open-Meteo (no API key, includes forecast + geocoding) — wrapped behind an internal adapter (`src/lib/weather/`)
- **Reverse geocoding:** BigDataCloud `reverse-geocode-client` (no key) maps coords → place name for "use my location" — its own isolated, rate-limited adapter (`src/lib/geo/`), kept separate from the weather provider
- **Icons:** Phosphor (`@phosphor-icons/react`) — one family, standardized on `weight="light"`
- **Fonts:** Bricolage Grotesque (UI) + Geist Mono (numeric data), via `next/font`
- **Hosting:** Vercel

## Commands

```bash
npm run dev      # dev server (Turbopack) → http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next: core-web-vitals + typescript)
```

There is no test runner configured yet. If you add tests (see plan §11), document the command here.

## Git

- **Commit straight to `main` by default.** Only work on another branch when explicitly pointed at one or asked to create one.
- **Commit, don't push.** Make the commit locally and stop there; only push when explicitly asked.
- **Reconcile the docs before committing.** When asked to commit, first check `docs/documentation.md` (and any other affected doc) against the changes for mismatches or missing information, and bring it up to date as part of the commit.

## When unsure

If a request is ambiguous or you're uncertain what the user is going for, ask a clarifying question or offer a few options to choose from rather than guessing. A short question up front beats building the wrong thing.

## Conventions

- **`src/` directory.** All app code lives under `src/`. Import alias `@/*` → `./src/*` (e.g. `@/lib/weather`, `@/components/CurrentConditions`). Use it instead of long relative paths.
- **Server Components by default.** Do the forecast fetch in Server Components so the provider response stays off the client bundle and caching is centralized. Add `"use client"` only for interactive pieces (unit toggle, search box, favorites).
- **Normalize at the boundary.** The rest of the app talks to _our_ types, never the provider's response shape. All Open-Meteo specifics stay inside `src/lib/weather/`; swapping providers should be a one-file change.
- **Keep secrets server-side.** Open-Meteo needs no key, but if a keyed provider is ever added, fetch only from a Server Component or a Route Handler (`src/app/api/.../route.ts`) — never ship a key to the browser. Commit a `.env.example` (names, no values).
- **Caching & call discipline:** every outbound call goes through `src/lib/outbound.ts` (`cachedFetch` + multi-window `createLimiter`). Layers, cheapest first: Next `revalidate` (forecast ~15 min; geocoding + reverse geocoding ~24 h) → a per-instance memo so repeats skip the fetch → a circuit-breaker cap charged **only on a cache miss**, so it limits upstream calls, not cache hits. Maximize cache reuse by collapsing keys (round coords to ~1 km, normalize query strings). Caps are per-instance/best-effort on serverless — a global ceiling would need a shared store (Vercel KV); not worth it at current scale. Free tiers aren't guaranteed; stay conservative.
- **Geolocation is permission-gated.** Manual search is the primary path; "use my location" is an enhancement that degrades gracefully (granted / denied / unavailable). The browser API is client-only, so coords round-trip through the URL (`/weather?lat&lon`) for the server to fetch — never fetch the provider from the browser.

## Layout

Current scaffold:

```
src/
├─ app/
│  ├─ layout.tsx, globals.css            # App Router root (fonts, dark theme lock, utilities)
│  ├─ page.tsx (landing), not-found.tsx  # marketing landing + custom 404
│  └─ weather/
│     ├─ page.tsx                        # Server Component: live fetch (?q / ?lat&lon) → WeatherView
│     └─ loading.tsx                     # route-level skeleton
├─ components/
│  ├─ MercuryField.tsx, MercuryBlob.tsx, mercury-shaders.ts     # liquid-mercury bg
│  ├─ WeatherView.tsx                    # "use client" shell (units/search/geolocation, layout)
│  ├─ CurrentConditions, DetailsGrid, HourlyStrip, DailyForecast
│  ├─ LocationSearch.tsx, UnitToggle.tsx # "use client" interactive leaves
│  └─ WeatherIcon.tsx                    # condition → Phosphor glyph
├─ lib/
│  ├─ weather/  index.ts (public interface), provider.ts (Open-Meteo adapter),
│  │            wmo.ts (WMO code → condition), types.ts (normalized model), mock.ts (sample fallback)
│  ├─ geo/      reverse.ts               # coords → place name (BigDataCloud), cached + rate-limited
│  ├─ outbound.ts                        # shared cachedFetch + multi-window rate limiter (all 3 APIs)
│  └─ format.ts                          # temp/wind/visibility/pressure + unit conversion
└─ hooks/  useMercuryCanvas.ts (WebGL setup), useGeolocation.ts (permission-gated coords)
public/   static assets
docs/     implementation-plan.md, documentation.md
```

Still to land (per the plan): `FavoritesBar` + a favorites store, and a `useUnits` hook to persist the °C/°F choice. A Route Handler (`app/api/.../route.ts`) is only needed if a keyed provider is ever added — Open-Meteo and BigDataCloud need none.

> Note: the plan's tree shows top-level `app/`, `lib/`, etc. — this project uses `src/`, so place everything under `src/`.

## Landing & 404

The marketing landing lives at `src/app/page.tsx` (route `/`) — a dark, theme-locked hero: the chrome **Mercury** wordmark, a one-line promo, and a single "Get started" CTA over an animated liquid-mercury background. The custom 404 (`src/app/not-found.tsx`) reuses the same look with a single mercury spill. Key pieces:

- **Mercury background** — a raw WebGL fragment shader (mercury metaballs, no Three.js). The shared plumbing lives in the **`useMercuryCanvas`** hook (`src/hooks/`): it caps DPR, honors `prefers-reduced-motion` (one static frame), and frees its RAF/listeners/GL resources on unmount (it intentionally does not force-lose the WebGL context, which would blank the canvas under Strict Mode / canvas reuse). Two thin `"use client"` leaves consume it — **`MercuryField`** (landing: droplets pooling at the bottom) and **`MercuryBlob`** (404: one morphing spill) — with the GLSL in **`mercury-shaders.ts`**. They're separate component types on purpose, so client navigation remounts them with a fresh canvas/context instead of reusing one. If WebGL is unavailable, the CSS radial gradient on the parent shows instead.
- **`src/app/globals.css`** — the page is locked to dark (`color-scheme: dark`, no per-section flips). Reusable utilities: `.text-chrome` (metallic wordmark fill), `.glass` (frosted pill with a reduced-transparency fallback), `.cta-ring` (animated CTA halo via a registered `@property --cta-angle`), `.animate-rise` (staggered entrance). All motion collapses under `prefers-reduced-motion`.

Keep the WebGL/animation work isolated in client leaves; the pages themselves stay Server Components.

## Weather view

The main app view lives at `src/app/weather/page.tsx` (route `/weather`). The Server Component resolves a normalized `WeatherSnapshot` from **live Open-Meteo data** (via `src/lib/weather`) and hands it to **`WeatherView`** (`"use client"`), which owns the unit + search state and composes the presentational pieces. Three entry points: `?q=<place>` (search), `?lat&lon` ("use my location"), or neither (default **Prague**). Any provider error or unfound place falls back to the sample snapshot, flagged so the UI shows a disclaimer instead of passing it off as real.

- **`CurrentConditions`** — location, local time, the big chrome temperature, condition, feels-like, H/L.
- **`DetailsGrid`** — 8 liquid-glass stat tiles (feels-like, wind, humidity, UV, visibility, pressure, sunrise, sunset).
- **`HourlyStrip`** — horizontal scroll-snap of the next 24 hours.
- **`DailyForecast`** — 7 rows with per-day temperature range bars scaled to the week's min/max.
- **`LocationSearch`** — submitting navigates to `/weather?q=…`; the pin button runs the `useGeolocation` flow (owned by `WeatherView`) and navigates to `/weather?lat&lon` on success. `UnitToggle` drives live °C/°F conversion (not yet persisted).

Data flow: `page.tsx` calls `getWeatherByQuery` / `getWeatherByCoords` from `src/lib/weather` (public interface in `index.ts`; the Open-Meteo adapter + normalization in `provider.ts`; WMO weather-code → our `Condition` in `wmo.ts`). The "use my location" path also calls `reverseGeocode` from `src/lib/geo` for the place name. Models + formatting: `types.ts` (normalized model), `mock.ts` (sample fallback, same shape), `format.ts` (temp/wind/visibility/pressure + metric/imperial). Icons come from Phosphor via **`WeatherIcon`** (condition + day/night → one glyph). Numbers render in Geist Mono; the rest is Bricolage Grotesque.

When `source` isn't `live` (`offline` = provider unreachable, `missing` = place not found), `WeatherView` renders an amber disclaimer above the footer so sample data is never mistaken for real conditions.

Glass utilities (`globals.css`): **`.glass-dark`** (the floating dynamic-island nav), **`.glass-panel`** (body card surface), and **`.glass-interactive`** (compose with `.glass-panel` for a hover lift/brighten, dropped under `prefers-reduced-motion`). Each keeps a `prefers-reduced-transparency` solid fallback, alongside the existing `.glass` pill.

## Status

Phase 0 (scaffold) done; dark liquid-mercury landing at `/` and a matching custom 404 (see **Landing & 404**); and the main weather view at `/weather` (see **Weather view**) running on **live Open-Meteo data**.

Done:
- Normalized weather types (`src/lib/weather/types.ts`), formatters with metric/imperial conversion (`src/lib/format.ts`), and the full UI (current conditions, conditions grid, hourly strip, 7-day forecast) with a working °C/°F toggle.
- **Open-Meteo adapter** (`provider.ts` + `index.ts` + `wmo.ts`): cached, revalidated forecast + geocoding behind our normalized types.
- **Location search** (geocoded via `?q=`) and **"use my location"** (auto-prompt on the default view; `?lat&lon` → forecast + BigDataCloud reverse geocode in `src/lib/geo/reverse.ts`, rate-limited).
- **Graceful fallback:** sample snapshot + an honest disclaimer when the provider is unreachable (`offline`) or a place isn't found (`missing`).
- **Caching & rate limiting** (`src/lib/outbound.ts`): all three outbound calls share `cachedFetch` (Next revalidate + per-instance memo) and a multi-window `createLimiter` circuit breaker charged only on cache misses; cache keys collapsed via coord rounding + query normalization.

Next per the plan: persist the unit choice (a `useUnits` hook), add favorite locations + a `FavoritesBar`, richer denied/unavailable geolocation feedback, and the first tests (formatters + adapter).
