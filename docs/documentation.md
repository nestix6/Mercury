# Mercury — Documentation

A short tour of how Mercury is built and how it works, phase by phase.

## Phase 1 — Initial scaffold

- `create-next-app`: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4.
- All app code under `src/` with the `@/*` import alias; dark, theme-locked tokens in `src/app/globals.css`.
- Two rules that shaped everything after: **normalize at the boundary** (the UI only knows our own types, never a provider's shape) and **Server Components by default** (interactivity isolated in small client leaves).

## Phase 2 — Landing page UI

- Marketing landing (`/`) and a matching custom 404: the chrome **Mercury** wordmark, a one-line promo, and a single "Get started" CTA (points at `/weather`).
- **Mercury background** — a hand-written WebGL liquid-mercury shader. `useMercuryCanvas` holds the plumbing; `MercuryField` (landing) and `MercuryBlob` (404) are thin `"use client"` leaves; the GLSL lives in `mercury-shaders.ts`. It caps device-pixel-ratio, shows one static frame under `prefers-reduced-motion`, and falls back to a CSS gradient where WebGL is unavailable.
- Brand utilities in `globals.css`: `.text-chrome` (metallic wordmark), `.glass` (frosted pill), `.cta-ring` (animated CTA halo), `.animate-rise` (staggered entrance).

## Phase 3 — Placeholder weather (`/weather`)

The full forecast UI, running on mock data — no live API yet.

**Built, in order:**

1. **Data model** — `lib/weather/types.ts`, the normalized, all-metric weather model the app speaks.
2. **Formatting** — `lib/format.ts`, display strings plus metric ⇄ imperial conversion.
3. **Mock data** — `lib/weather/mock.ts`, a placeholder snapshot in that normalized shape.
4. **Icons** — Phosphor + `WeatherIcon` (condition + day/night → one glyph).
5. **Presentational components** — `CurrentConditions`, `DetailsGrid`, `HourlyStrip`, `DailyForecast`; pure, data in, markup out.
6. **Interactive leaves** — `LocationSearch`, `UnitToggle`.
7. **Composition + route** — `WeatherView` (`"use client"`) owns units/search state and composes the sections; `weather/page.tsx` (Server Component) builds the snapshot; `loading.tsx` is the skeleton.
8. **Polish** — dynamic-island nav and liquid-glass cards (`.glass-dark` / `.glass-panel` / `.glass-interactive`); Bricolage Grotesque UI font with Geist Mono for numbers.

**How it works:**

```
weather/page.tsx (Server Component) — builds a normalized WeatherSnapshot (today: MOCK_WEATHER)
  → WeatherView ("use client") — owns units + search query
    → CurrentConditions · DetailsGrid · HourlyStrip · DailyForecast   (pure)
      + LocationSearch · UnitToggle                                   (interactive)
```

- **One source of data.** Only the Server page holds the snapshot (`MOCK_WEATHER`); the components only know the normalized shape, so the data source is swappable without touching them.
- **Units are a render concern.** Data is stored in metric; `UnitToggle` flips a value and `lib/format.ts` converts on the way to the screen, so °C/°F is instant and never refetches.
- **What renders.** A big chrome current temperature (with feels-like and H/L), an 8-tile conditions grid, a 24-hour scroll-snap strip ("Now" highlighted), and a 7-day list whose range bars share one scale (the week's min/max). `LocationSearch` and the "use my location" button are working shells — no geocoding or geolocation.
- **Glass system (`globals.css`).** Dark, theme-locked. `.glass-dark` (nav island), `.glass-panel` (cards), and `.glass-interactive` (hover lift) extend the landing's `.glass`.
- **Degrades gracefully.** `prefers-reduced-motion` drops animation/lift, `prefers-reduced-transparency` makes glass solid, no-WebGL falls back to a CSS gradient, and `loading.tsx` prevents first-paint shift.
