# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Priorities: speed, a calm/legible UI, and accurate data.

> This file is the source of truth for scope, conventions, and key decisions. `docs/documentation.md` is a phase-by-phase tour of how the app was built; the normalized data model lives in `src/lib/weather/types.ts`.

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
npm test         # Vitest (one run); `npm run test:watch` to watch
```

Tests run on **Vitest** in a **jsdom** environment (config in `vitest.config.ts`; `tests/setup.ts` wires up jest-dom matchers + React Testing Library cleanup). Specs live under `tests/`, mirroring the `src/` layout (e.g. `tests/lib/weather/provider.test.ts`, `tests/components/DetailsGrid.test.tsx`); they import through the `@/*` alias, so they don't depend on their own location. Coverage: unit tests over the pure logic — formatters, WMO mapping, unit/location cookie parsers, the rate limiter, and the provider adapter (mocking `cachedFetch` at the network boundary) — plus component tests of the forecast views (`CurrentConditions`, `DetailsGrid`, `HourlyStrip`, `DailyForecast`) rendered against the `MOCK_WEATHER` snapshot.

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
- **Keep secrets server-side.** Open-Meteo and BigDataCloud need no keys, so there's no `.env.example` today (an empty one would be noise). If a keyed provider is ever added, fetch only from a Server Component or a Route Handler (`src/app/api/.../route.ts`) — never ship a key to the browser — and add a `.env.example` (names, no values) at that point.
- **Caching & call discipline:** every outbound call goes through `src/lib/outbound.ts` (`cachedFetch` + multi-window `createLimiter`). Slow-moving data (geocoding + reverse geocoding) uses Next's durable `revalidate` (~24 h). The **forecast** instead opts out with `cache: "no-store"` — Next's `revalidate` is stale-while-revalidate, so on a low-traffic app the first visit after an idle gap gets served a stale snapshot; bypassing it makes the **per-instance memo** the freshness guard (a hard ~5-min TTL, synchronous on miss → data is at most ~5 min stale, repeat loads still skip the network). On top sits a circuit-breaker cap charged **only on a network miss**, so it limits upstream calls, not cache hits. Maximize cache reuse by collapsing keys (round coords to ~111 m / 3 dp — coarser rounding can cross Open-Meteo's high-res grid cells and read several °C off — normalize query strings). Caps are per-instance/best-effort on serverless — a global ceiling would need a shared store (Vercel KV); not worth it at current scale. Free tiers aren't guaranteed; stay conservative.
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
│  ├─ WeatherView.tsx                    # "use client" shell (units/search/geolocation/bookmarks, layout)
│  ├─ CurrentConditions, DetailsGrid, DailyForecast              # presentational
│  ├─ HourlyStrip.tsx                    # "use client" (keyboard-scrollable strip)
│  ├─ LocationSearch.tsx, UnitToggle.tsx, BookmarksMenu.tsx # "use client" interactive leaves
│  └─ WeatherIcon.tsx                    # condition → Phosphor glyph
├─ lib/
│  ├─ weather/  index.ts (public interface), provider.ts (Open-Meteo adapter),
│  │            actions.ts ("use server" search-suggestion boundary),
│  │            wmo.ts (WMO code → condition), types.ts (normalized model), mock.ts (sample fallback)
│  ├─ geo/      reverse.ts               # coords → place name (BigDataCloud), cached + rate-limited
│  ├─ outbound.ts                        # shared cachedFetch + multi-window rate limiter (all 3 APIs)
│  ├─ format.ts                          # temp/wind/visibility/pressure + unit conversion
│  ├─ units.ts                           # unit cookie name + parser (shared by server + client)
│  ├─ location-store.ts                  # remembered-location cookies (parse/serialize/write)
│  └─ bookmark-store.ts                  # saved-locations list in localStorage (read/write/placeKey)
└─ hooks/  useMercuryCanvas.ts (WebGL setup), useGeolocation.ts (permission-gated coords), useUnits.ts (cookie-persisted °C/°F), useLocationSearch.ts (debounced search autocomplete), useBookmarks.ts (localStorage saved locations)
public/   static assets
docs/     documentation.md
```

Scope notes: the MVP and the planned Phase-2 polish are all shipped, plus **bookmarks** (saved locations — see **Weather view** → `BookmarksMenu`). The app is **dark-theme only** by design — no light theme / system-preference switching. A Route Handler (`app/api/.../route.ts`) is only needed if a keyed provider is ever added — Open-Meteo and BigDataCloud need none.

## Landing & 404

The marketing landing lives at `src/app/page.tsx` (route `/`) — a dark, theme-locked hero: the chrome **Mercury** wordmark, a one-line promo, and a single "Get started" CTA over an animated liquid-mercury background. The custom 404 (`src/app/not-found.tsx`) reuses the same look with a single mercury spill. Key pieces:

- **Mercury background** — a raw WebGL fragment shader (mercury metaballs, no Three.js). The shared plumbing lives in the **`useMercuryCanvas`** hook (`src/hooks/`): it caps DPR, honors `prefers-reduced-motion` (one static frame), and frees its RAF/listeners/GL resources on unmount (it intentionally does not force-lose the WebGL context, which would blank the canvas under Strict Mode / canvas reuse). Two thin `"use client"` leaves consume it — **`MercuryField`** (landing: droplets pooling at the bottom) and **`MercuryBlob`** (404: one morphing spill) — with the GLSL in **`mercury-shaders.ts`**. They're separate component types on purpose, so client navigation remounts them with a fresh canvas/context instead of reusing one. If WebGL is unavailable, the CSS radial gradient on the parent shows instead.
- **`src/app/globals.css`** — the page is locked to dark (`color-scheme: dark`, no per-section flips). Reusable utilities: `.text-chrome` (metallic wordmark fill), `.glass` (frosted pill with a reduced-transparency fallback), `.cta-ring` (animated CTA halo via a registered `@property --cta-angle`), `.animate-rise` (staggered entrance). All motion collapses under `prefers-reduced-motion`.

Keep the WebGL/animation work isolated in client leaves; the pages themselves stay Server Components.

## Weather view

The main app view lives at `src/app/weather/page.tsx` (route `/weather`). The Server Component resolves a normalized `WeatherSnapshot` from **live Open-Meteo data** (via `src/lib/weather`) and hands it to **`WeatherView`** (`"use client"`), which owns the unit + search state and composes the presentational pieces. Entry points: `?q=<place>` (search), `?lat&lon` ("use my location" / a picked search result), or neither — the bare view restores the **last remembered location** (3B) and otherwise falls back to **Prague**. Any provider error or unfound place falls back to the sample snapshot, flagged so the UI shows a disclaimer instead of passing it off as real.

- **`CurrentConditions`** — location, local time, the big chrome temperature, condition, feels-like, H/L. A bookmark toggle beside the place name saves/unsaves the current location (filled when saved).
- **`DetailsGrid`** — 8 liquid-glass stat tiles (feels-like, wind, humidity, UV, visibility, pressure, sunrise, sunset).
- **`HourlyStrip`** — horizontal scroll-snap of the next 24 hours; a small `"use client"` leaf so it's keyboard-operable (focusable scroller, Arrow/Home/End to scroll, smooth scroll dropped under reduced-motion).
- **`DailyForecast`** — 7 rows with per-day temperature range bars scaled to the week's min/max.
- **`LocationSearch`** — an ARIA combobox with a debounced autocomplete: as you type it lists candidate places (so "Paris"/"Springfield" disambiguate). Picking one navigates to `/weather?lat&lon&name&region` — the server uses that label directly and skips reverse geocoding, loading the exact place with no re-geocode. Pressing Enter with nothing highlighted falls back to `/weather?q=…`. The pin button runs the `useGeolocation` flow (owned by `WeatherView`) and navigates to `/weather?lat&lon` on success. A denied/unavailable/failed geolocation attempt shows an inline hint under the nav instead of failing silently. **Remembered location (3B):** any user-resolved live view (geolocation, a picked suggestion, or a `?q=` search) writes a `mercury-place` cookie via `src/lib/location-store.ts`, so a return to the bare `/weather` restores it instead of Prague; a `mercury-geo-asked` cookie stops the auto-prompt from firing on every visit (only a first-ever bare visit prompts — after that the pin button is the way in). `WeatherLocation` now carries `latitude`/`longitude` so a live snapshot is enough to remember. `UnitToggle` drives live °C/°F conversion, persisted in a cookie (`useUnits`) and read server-side so the first paint already shows the saved unit (no flash).
- **Autocomplete data flow.** The suggestion fetch is a Server Action (`src/lib/weather/actions.ts`, `searchLocationsAction`) wrapping `searchSuggestions` in `provider.ts` — no public route handler, provider specifics stay server-side. It's driven by `useLocationSearch` (`src/hooks/`), owned by `WeatherView` so one debounced fetch serves both responsive `LocationSearch` slots.
- **`BookmarksMenu` (bookmarks).** A "Saved" dropdown in the nav lists saved locations (`.glass-dark`, styled like the suggestions); clicking a row navigates to it (the shared `goToPlace` → `/weather?lat&lon&name&region`, no re-geocode), and a per-row × removes it. The list is owned by **`useBookmarks`** (`src/hooks/`) and persisted in **localStorage** via `src/lib/bookmark-store.ts` — deliberately *not* a cookie: bookmarks never influence the server-rendered first paint (unlike units / remembered-location), and a growing list shouldn't ride along on every request. It starts empty and hydrates after mount (so SSR and the first client render agree). A bookmark stores only a place's identity (`{ lat, lon, name, region }`, the same `StoredPlace` shape as the remembered location) — never weather data, which would go stale; identity/dedup is by rounded coords (`placeKey`).

Data flow: `page.tsx` calls `getWeatherByQuery` / `getWeatherByCoords` from `src/lib/weather` (public interface in `index.ts`; the Open-Meteo adapter + normalization in `provider.ts`; WMO weather-code → our `Condition` in `wmo.ts`). The "use my location" path also calls `reverseGeocode` from `src/lib/geo` for the place name. Models + formatting: `types.ts` (normalized model), `mock.ts` (sample fallback, same shape), `format.ts` (temp/wind/visibility/pressure + metric/imperial). Icons come from Phosphor via **`WeatherIcon`** (condition + day/night → one glyph). Numbers render in Geist Mono; the rest is Bricolage Grotesque.

When `source` isn't `live` (`offline` = provider unreachable, `missing` = place not found), `WeatherView` renders an amber disclaimer above the footer so sample data is never mistaken for real conditions.

Glass utilities (`globals.css`): **`.glass-dark`** (the floating dynamic-island nav, and the search suggestions dropdown — chosen over `.glass` so candidates stay legible), **`.glass-panel`** (body card surface), and **`.glass-interactive`** (compose with `.glass-panel` for a hover lift/brighten, dropped under `prefers-reduced-motion`). Each keeps a `prefers-reduced-transparency` solid fallback, alongside the existing `.glass` pill. `globals.css` also defines one shared high-contrast `:focus-visible` ring for interactive controls (the dark glass swallows the default outline); specificity-0 (`:where(...)`) so a component can still opt into its own focus treatment.

## Status

**Everything is shipped** — all phases through Phase 12 are done. The app is a dark liquid-mercury landing at `/`, a matching custom 404 (see **Landing & 404**), and the main weather view at `/weather` (see **Weather view**) running on **live Open-Meteo data**, with persistence, bookmarks, caching/rate-limit hardening, accessibility, mobile responsiveness, and a Vitest suite on top.

Done, by phase (`docs/documentation.md` has the full phase-by-phase tour):

- **1–2 — Scaffold & landing:** Next.js 16 App Router + strict TS + Tailwind v4 base; the WebGL liquid-mercury landing at `/` and the matching 404. See **Landing & 404**.
- **3 — Weather UI:** normalized weather types (`src/lib/weather/types.ts`), formatters with metric/imperial conversion (`src/lib/format.ts`), and the full UI (current conditions, conditions grid, hourly strip, 7-day forecast) with a working °C/°F toggle — first built on mock data.
- **4 — Live data & location:** the **Open-Meteo adapter** (`provider.ts` + `index.ts` + `wmo.ts`) — cached, revalidated forecast + geocoding behind our normalized types; **location search** + **"use my location"** (`?lat&lon` → forecast + BigDataCloud reverse geocode in `src/lib/geo/reverse.ts`); and **graceful fallback** to a sample snapshot with an honest disclaimer when the provider is unreachable (`offline`) or a place isn't found (`missing`).
- **5 — Caching & rate limiting** (`src/lib/outbound.ts`): all three outbound calls share `cachedFetch` (Next revalidate + per-instance memo) and a multi-window `createLimiter` circuit breaker charged only on cache misses; cache keys collapsed via coord rounding + query normalization.
- **6 — Persisted units & geolocation feedback:** the °C/°F choice is stored in a cookie (`useUnits` + `src/lib/units.ts`) and read by the Server Component, so the first paint matches the saved unit with no flash; a denied/unavailable/failed geolocation attempt now surfaces an inline hint instead of silently staying on Prague.
- **7 — Search disambiguation:** the search box is a debounced autocomplete combobox (`searchSuggestions` via the `searchLocationsAction` Server Action + `useLocationSearch`); selecting a candidate loads that exact place via `?lat&lon&name&region` (server skips reverse geocoding), and Enter with nothing selected falls back to `?q=`. See **Weather view** → `LocationSearch` / "Autocomplete data flow".
- **8 — Remember the last location:** the bare `/weather` restores the last user-resolved location (`mercury-place` cookie) instead of Prague, and stops auto-prompting for geolocation on every visit (`mercury-geo-asked`); coords now ride along in `WeatherLocation`. See **Weather view** → `LocationSearch`.
- **9 — Accessibility pass:** keyboard-operable hourly strip (`HourlyStrip` is now `"use client"`), a shared `:focus-visible` ring in `globals.css`, and contrast bumps (`zinc-500` → `zinc-400` on the daily low / tile detail / footer). The first-visit geolocation auto-prompt was kept (already once-only after Phase 8).
- **10 — Mobile responsiveness:** the weather view and landing reflow cleanly on small screens.
- **11 — Tests (Vitest + jsdom):** unit suites over the pure logic — `format`, `wmo`, `units`, `location-store`, `bookmark-store`, the `createLimiter` budget, the provider adapter normalization (mocking `cachedFetch`), and the `useGeolocation` / `useBookmarks` hooks — plus component tests of the forecast views (`CurrentConditions`, `DetailsGrid`, `HourlyStrip`, `DailyForecast`) against `MOCK_WEATHER`. Run with `npm test`. See **Commands**.
- **12 — Bookmarks (saved locations):** a "Saved" dropdown (`BookmarksMenu`) in the nav and a bookmark toggle in `CurrentConditions`, backed by a localStorage list (`useBookmarks` + `src/lib/bookmark-store.ts`). Stores only place identity, navigates via the shared `goToPlace`. Deliberately localStorage, not a cookie (doesn't affect first paint; shouldn't grow the request). See **Weather view** → `BookmarksMenu`.
