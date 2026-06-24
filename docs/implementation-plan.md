# Mercury — Implementation Plan

> A fast, clean weather app built with Next.js. Named for the planet closest to the sun and for the liquid that once climbed the inside of every thermometer.

---

## 1. Overview

Mercury is a web app that shows current conditions, an hourly view, and a multi-day forecast for any location. The priorities are speed, a calm and legible interface, and accurate data. The first release targets a single-page experience: search or detect a location, then see everything that matters at a glance.

## 2. Goals & Non-Goals

**Goals**

- Current conditions + hourly + 7-day forecast for any searchable location
- Geolocation ("use my location") with a graceful fallback to manual search
- Saved/favorite locations the user can switch between
- Imperial/metric toggle that persists
- Fast first paint and minimal layout shift

## 3. Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js (App Router) | Server Components for data fetching, Route Handlers for any proxying |
| Language | TypeScript | Strict mode on |
| Styling | Tailwind CSS | Fast iteration; pairs well with a small component set |
| Data fetching | Native `fetch` + Next caching | Use `revalidate` for forecast freshness |
| State (client) | React state + a light store if needed (Zustand optional) | Favorites, unit toggle |
| Icons | An open weather-icon set (e.g. weather-icons) or custom SVGs | Avoid licensed/branded sets |
| Hosting | Vercel | Native fit for Next.js; edge caching helps |

## 4. Weather Data Source

Pick one provider to start; the app should wrap it behind a small internal interface so it can be swapped later.

| Provider | API key needed | Free tier | Notes |
| --- | --- | --- | --- |
| **Open-Meteo** | No | Generous, no key | Great default for a starter project; forecast + geocoding endpoints |
| OpenWeatherMap | Yes | Yes (rate-limited) | Very common, lots of docs |
| WeatherAPI.com | Yes | Yes | Clean JSON, good forecast detail |
| National Weather Service (US) | No | Yes | US-only, free, government source |

**Recommendation:** start with **Open-Meteo** — no API key, no billing setup, and it has a companion geocoding API for the location search box. Move to a keyed provider later only if you need data it doesn't offer.

Wrap whichever provider you choose in `lib/weather/` so the rest of the app talks to _your_ types, not the provider's response shape.

## 5. Architecture

```
Browser
  │  (search query / geolocation coords)
  ▼
Next.js App Router
  ├─ Server Component  → fetch forecast (cached, revalidated)
  ├─ Route Handler     → optional proxy if a key must stay server-side
  └─ Client Components → unit toggle, favorites, location switcher
        │
        ▼
  lib/weather  (provider adapter → normalized internal types)
        │
        ▼
  Weather provider API + Geocoding API
```

- **Server Components** do the forecast fetch so the API response never bloats the client bundle and so caching is centralized.
- A **Route Handler** is only required if your chosen provider needs a secret key — keep the key on the server and never ship it to the browser.
- **Client Components** own anything interactive: the unit toggle, the favorites list, and the search box.

## 6. Feature Breakdown

**MVP**

- Location search (city name → coordinates via geocoding)
- "Use my location" via the browser Geolocation API
- Current conditions card: temp, feels-like, condition, high/low, wind, humidity
- Hourly strip (next ~24h)
- 7-day forecast list
- Unit toggle (°C/°F, km/h vs mph) that persists

**Phase 2**

- Favorite locations, switchable from a dropdown or chips
- Sunrise/sunset, UV index, "feels like" detail
- Light/dark theme that follows system preference
- Loading skeletons and offline/error states

## 7. Suggested Project Structure

```
mercury/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                 # main view (Server Component)
│  ├─ loading.tsx              # route-level loading UI
│  └─ api/
│     └─ weather/route.ts      # only if a secret key needs proxying
├─ components/
│  ├─ CurrentConditions.tsx
│  ├─ HourlyStrip.tsx
│  ├─ DailyForecast.tsx
│  ├─ LocationSearch.tsx
│  ├─ UnitToggle.tsx
│  └─ FavoritesBar.tsx
├─ lib/
│  ├─ weather/
│  │  ├─ index.ts              # public interface used by the app
│  │  ├─ provider.ts           # adapter for the chosen API
│  │  └─ types.ts              # normalized internal types
│  └─ format.ts                # temp/wind/date formatting helpers
├─ hooks/
│  ├─ useGeolocation.ts
│  └─ useUnits.ts
├─ public/
└─ ...config files
```

## 8. Implementation Phases

**Phase 0 — Setup (½ day)**
Scaffold with `create-next-app` (TypeScript, Tailwind, App Router). Configure ESLint/Prettier, set up the repo, and add an `.env.example`.

**Phase 1 — Data layer (1 day)**
Build `lib/weather`: pick the provider, define normalized types, write the adapter, and prove an end-to-end fetch for a hardcoded location.

**Phase 2 — Core UI (2 days)**
Build the current-conditions, hourly, and daily components against the normalized types. Wire them into the main Server Component page.

**Phase 3 — Location & units (1–2 days)**
Add the geocoding-backed search box, "use my location," and the persistent unit toggle.

**Phase 4 — Favorites & polish (1–2 days)**
Favorites (local storage first), loading skeletons, error/empty states, theming, and responsive cleanup.

**Phase 5 — Deploy (½ day)**
Ship to Vercel, set environment variables, verify caching/revalidation in production.

## 9. Key Technical Decisions

- **Caching:** forecasts don't need to be real-time. Revalidate on an interval (e.g. every 10–15 minutes) so you stay well inside provider rate limits while keeping data fresh.
- **Keep secrets server-side:** if your provider uses a key, fetch from a Server Component or Route Handler — never expose the key in client code.
- **Normalize early:** convert provider responses to your own types at the boundary so swapping providers later is a one-file change.
- **Geolocation is permission-gated:** always offer manual search as the primary path; treat "use my location" as an enhancement.

## 10. Environment & Configuration

```
# .env.local  (only if your provider needs a key)
WEATHER_API_KEY=your_key_here
```

Commit a `.env.example` with the variable names but no values. If you start with Open-Meteo, you may not need any keys at all.

## 11. Testing

- Unit-test the formatting helpers and the provider adapter (mock the API response).
- Component-test the forecast components with sample normalized data.
- Manually verify geolocation permission flows (granted, denied, unavailable).

## 12. Future Enhancements

- Severe-weather alerts and a notification opt-in
- Temperature/precipitation charts
- Accounts to sync favorites
- Installable PWA with offline last-known forecast
- Localization (units, language, date formats)

---
