# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Priorities: speed, a calm/legible UI, and accurate data. See `docs/implementation-plan.md` for the full plan, phases, and scope.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (config-less; PostCSS plugin in `postcss.config.mjs`, theme in `src/app/globals.css`)
- **Data:** native `fetch` + Next caching (`revalidate`)
- **Provider:** Open-Meteo (no API key, includes geocoding) — wrapped behind an internal adapter
- **Hosting:** Vercel

## Commands

```bash
npm run dev      # dev server (Turbopack) → http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next: core-web-vitals + typescript)
```

There is no test runner configured yet. If you add tests (see plan §11), document the command here.

## Conventions

- **`src/` directory.** All app code lives under `src/`. Import alias `@/*` → `./src/*` (e.g. `@/lib/weather`, `@/components/CurrentConditions`). Use it instead of long relative paths.
- **Server Components by default.** Do the forecast fetch in Server Components so the provider response stays off the client bundle and caching is centralized. Add `"use client"` only for interactive pieces (unit toggle, search box, favorites).
- **Normalize at the boundary.** The rest of the app talks to _our_ types, never the provider's response shape. All Open-Meteo specifics stay inside `src/lib/weather/`; swapping providers should be a one-file change.
- **Keep secrets server-side.** Open-Meteo needs no key, but if a keyed provider is ever added, fetch only from a Server Component or a Route Handler (`src/app/api/.../route.ts`) — never ship a key to the browser. Commit a `.env.example` (names, no values).
- **Caching:** forecasts aren't real-time. Revalidate on an interval (~10–15 min) to stay fresh and well inside rate limits.
- **Geolocation is permission-gated.** Manual search is the primary path; "use my location" is an enhancement that must degrade gracefully (granted / denied / unavailable).

## Layout

Current scaffold:

```
src/
├─ app/          layout.tsx, page.tsx (landing), globals.css   # App Router root
└─ components/   MercuryBackground.tsx                         # WebGL liquid-mercury hero bg
public/          static assets
docs/            implementation-plan.md
```

Target structure as features land (mirror the plan under `src/`):

```
src/
├─ app/                  # routes; api/weather/route.ts only if a key needs proxying
├─ components/           # CurrentConditions, HourlyStrip, DailyForecast,
│                        #   LocationSearch, UnitToggle, FavoritesBar
├─ lib/
│  ├─ weather/           # index.ts (public interface), provider.ts (adapter), types.ts (normalized)
│  └─ format.ts          # temp/wind/date formatting helpers
└─ hooks/                # useGeolocation, useUnits
```

> Note: the plan's tree shows top-level `app/`, `lib/`, etc. — this project uses `src/`, so place everything under `src/`.

## Landing page

The marketing landing lives at `src/app/page.tsx` (route `/`) — a dark, theme-locked hero: the chrome **Mercury** wordmark, a one-line promo, and a single "Get started" CTA over an animated liquid-mercury background. Key pieces:

- **`src/components/MercuryBackground.tsx`** — a `"use client"` leaf that renders the background in a raw WebGL fragment shader (mercury metaballs: drifting droplets that merge into a pool, shaded as polished chrome). No Three.js. It caps DPR, honors `prefers-reduced-motion` (one static frame), cleans up its RAF/listeners, and loses the GL context on unmount. If WebGL is unavailable, the CSS radial gradient on the parent shows instead.
- **`src/app/globals.css`** — the page is locked to dark (`color-scheme: dark`, no per-section flips). Reusable utilities: `.text-chrome` (metallic wordmark fill), `.glass` (frosted pill with a reduced-transparency fallback), `.cta-ring` (animated CTA halo via a registered `@property --cta-angle`), `.animate-rise` (staggered entrance). All motion collapses under `prefers-reduced-motion`.

Keep the WebGL/animation work isolated in client leaves; the page itself stays a Server Component.

## Status

Phase 0 (scaffold) done, plus a dark liquid-mercury marketing landing at `/` (see **Landing page** above). Next up per the plan: Phase 1 — build `src/lib/weather` (normalized types + Open-Meteo adapter) and prove an end-to-end fetch for a hardcoded location.
