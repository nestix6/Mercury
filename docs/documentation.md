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

The full forecast UI, first built on mock data so the layout could be finished before the API landed (live data arrives in Phase 4).

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
- **What renders.** A big chrome current temperature (with feels-like and H/L), an 8-tile conditions grid, a 24-hour scroll-snap strip ("Now" highlighted), and a 7-day list whose range bars share one scale (the week's min/max). At this stage `LocationSearch` and the "use my location" button were working shells — geocoding and geolocation get wired in Phase 4.
- **Glass system (`globals.css`).** Dark, theme-locked. `.glass-dark` (nav island), `.glass-panel` (cards), and `.glass-interactive` (hover lift) extend the landing's `.glass`.
- **Degrades gracefully.** `prefers-reduced-motion` drops animation/lift, `prefers-reduced-transparency` makes glass solid, no-WebGL falls back to a CSS gradient, and `loading.tsx` prevents first-paint shift.

## Phase 4 — Live data & location

Mock data swapped for **live Open-Meteo**, plus the search and "use my location" flows — all without touching the presentational components (they still only know the normalized shape).

**Built, in order:**

1. **Open-Meteo adapter** — `lib/weather/provider.ts` fetches the forecast + geocoding with native `fetch` and Next caching, and normalizes the response into our types. `lib/weather/wmo.ts` maps WMO weather codes → our `Condition`. `lib/weather/index.ts` is the public interface (`getWeatherByQuery`, `getWeatherByCoords`, `searchLocations`). We use the JSON API directly, not the `openmeteo` SDK (it speaks FlatBuffers and would bypass the fetch cache).
2. **Page wiring** — `weather/page.tsx` becomes async with three entry points: `?q=<place>` (search), `?lat&lon` ("use my location"), or neither (default Prague). It stays a Server Component, so the provider response never reaches the client bundle.
3. **Geolocation** — `hooks/useGeolocation.ts` wraps the permission-gated browser API. On the default view `WeatherView` prompts on mount; granting navigates to `?lat&lon` (coords round-trip through the URL so the *server* does the fetch), denying stays on Prague. The pin button triggers the same flow manually.
4. **Reverse geocoding** — the browser gives coordinates but no name, and Open-Meteo only does name → coordinates. `lib/geo/reverse.ts` (BigDataCloud, keyless) resolves coords → city name, kept in its own module so the weather adapter stays single-provider.
5. **Honest fallback** — when the provider is unreachable (`offline`) or a place isn't found (`missing`), the page falls back to the sample snapshot and `WeatherView` shows an amber disclaimer so it's never mistaken for real data.

**How it works:**

```
weather/page.tsx (Server Component)
  ?q=<place>   → getWeatherByQuery   → Open-Meteo geocode + forecast
  ?lat&lon     → getWeatherByCoords  → Open-Meteo forecast  (+ geo/reverse for the name)
  (default)    → getWeatherByQuery("Prague")
    → normalized WeatherSnapshot (+ source: live | offline | missing)
      → WeatherView ("use client") — owns units, search, geolocation
```

- **Normalize at the boundary, still.** Everything provider-specific (URLs, WMO codes, response shape) lives in `lib/weather` and `lib/geo`; swapping providers is a one-module change and the UI is untouched.
- **Caching.** Geocoding and reverse geocoding cache ~24 h (coordinates don't move); the forecast uses `cache: "no-store"` with a ~5-min per-instance memo as its freshness guard (see Phase 5), so unchanged data is served from the memo rather than refetched, but a visit after an idle gap is never served a stale snapshot. Call-volume hardening (cache-key hygiene + circuit breakers) is Phase 5.
- **Units are still a render concern.** Live data is metric; `UnitToggle` + `lib/format.ts` convert on the way to the screen. Persisting the choice lands in Phase 6.

## Phase 5 — Caching & rate limiting

Tightening the outbound-call surface so unchanged data is never refetched and a runaway never hammers a free tier. All three external calls (Open-Meteo forecast + geocoding, BigDataCloud reverse) now share one helper, `lib/outbound.ts`.

**What it does, cheapest layer first:**

1. **Next `revalidate`** — the durable, cross-instance cache, used for the slow-moving lookups (geocoding + reverse ~24 h). The page re-running per request hits the cache, not the API. The **forecast deliberately opts out** of this layer (`cache: "no-store"`): Next's `revalidate` is *stale-while-revalidate*, so on a low-traffic app the first visit after an idle gap is served the last (possibly hours-old) snapshot while a refresh runs in the background. Bypassing it trades cross-instance reuse — cheap here, given Open-Meteo's generous 5000/hr — for first-load freshness.
2. **Per-instance memo** — `cachedFetch` keeps a short in-memory cache keyed by request URL, so repeat lookups skip the fetch entirely. For the forecast (no durable layer) this memo *is* the freshness guard: a hard ~5-min TTL that fetches synchronously on a miss, so data is at most ~5 min stale with no stale-first surprise. For geocoding it just collapses bursts on top of the durable cache.
3. **Circuit breaker** — `createLimiter` enforces a budget across *multiple windows at once* (e.g. per-minute **and** per-hour). It's charged **only on a memo miss** (a real network call), so it caps roughly the number of upstream calls rather than penalizing cache/memo hits. When the budget is spent, the call degrades gracefully (sample data + the `offline` disclaimer for weather; a generic "My location" label for reverse geocoding).

**Cache-key hygiene (the real call-count win):**

- **Coordinates round to ~111 m** (3 dp) before the forecast/reverse calls, so GPS jitter and near-identical points collapse onto one cache entry. (Originally 2 dp / ~1 km, but that could snap into an adjacent Open-Meteo high-res grid cell reading several °C apart — e.g. Bratislava read ~3 °C hotter — so it was tightened to 3 dp, which still dedupes but stays inside the same cell.) The forecast caches the *raw* response keyed by coords, applying the display name afterwards — so the same point can carry different labels without a stale-label bug. Rounding also keeps a precise home location out of the URL/history.
- **Query strings are normalized** (trim, lowercase, collapse whitespace) so `"Prague"`, `"prague"`, and `"  Prague  "` share one geocoding entry.

**Honest limits.** The memo and counters are per-instance and reset on cold start — best-effort on serverless. The durable layer is Next's cache; a true global hard ceiling would need a shared store (e.g. Vercel KV), deliberately left out as unnecessary at current scale. Ceilings are set generously (well under Open-Meteo's free 600/min · 5000/hr) so they never trip in normal use — they only catch abuse.

## Phase 6 — Persisted units & geolocation feedback

Two small quality fixes so the app remembers your preference and never fails silently.

- **Persisted unit choice.** The °C/°F toggle was plain client state, so it reset on every reload or navigation. It's now stored in a cookie. The decision to use a cookie (not `localStorage`) is deliberate: the Server Component reads it (`next/headers` → `cookies()`), so the very first paint already renders the saved unit — no flash of °C before flipping to °F. `lib/units.ts` holds the cookie name + a `parseUnits` narrower (a plain module, so the *server* page can call it — a `"use client"` export can't be invoked server-side), and `hooks/useUnits.ts` seeds from that server value and writes the cookie back on change.
- **Geolocation feedback.** `useGeolocation` already tracked `denied` / `unavailable` / `error`, but the view only read `"locating"`, so a denied prompt just stopped the spinner and silently stayed on Prague. `WeatherView` now maps those states to a short inline hint under the nav (`role="status"`) — telling the user to search or re-enable location — so the auto-prompt on the default view degrades visibly.

## Phase 7 — Search disambiguation

Search used to navigate straight to `/weather?q=<text>` and take the **first** geocoding hit, so ambiguous names ("Paris", "Springfield") silently resolved to whatever Open-Meteo ranked first and typos fell through to the `missing` disclaimer. The search box is now a debounced autocomplete that lets the user pick the exact place.

- **A Server Action, not a route handler.** `lib/weather/actions.ts` (`"use server"`) exposes `searchLocationsAction`, the client boundary. It keeps Open-Meteo specifics server-side and avoids a public GET endpoint (a route handler is only warranted once a keyed provider is added). It wraps `searchSuggestions` in `provider.ts`, which calls the existing `searchLocations(query, 5)` and reuses `describeRegion`, so a candidate's label matches what the forecast header would show.
- **One debounced fetch for two slots.** `LocationSearch` renders twice (desktop + mobile, CSS-hidden), so the fetch lives in `hooks/useLocationSearch.ts`, owned by `WeatherView`, and feeds both. It debounces ~250 ms, skips queries under 2 chars, and gives each effect run a `cancelled` flag so a superseded (or unmounted) request can't commit a stale result.
- **The picked place carries its own identity.** Selecting a candidate navigates to `/weather?lat&lon&name&region`. The server uses the supplied `name`/`region` directly as the label and **skips reverse geocoding** — so it loads that exact place with no re-geocode-and-guess and no extra BigDataCloud call. The bare geolocation path (coords with no `name`) still reverse-geocodes. `generateMetadata` shows the selected name in the title instead of the generic "My location".
- **Accessible combobox + graceful fallback.** `LocationSearch` is an ARIA combobox (`role="combobox"` / `listbox` / `option`, `aria-activedescendant`): ArrowUp/Down move the active row, Enter picks it, Escape / blur / outside-click close. Pressing Enter with nothing highlighted keeps the original `?q=` behaviour, so search still works without ever opening the dropdown.

## Phase 8 — Remember the last location

The bare `/weather` view auto-prompted for geolocation on **every** visit and always defaulted to Prague. It now remembers where you were and stops nagging.

- **Coordinates ride along in the snapshot.** `WeatherLocation` gained `latitude`/`longitude` (rounded ~1.1 km in `normalize`), so any live view is self-describing enough to be remembered — no separate plumbing, and the mock carries Prague's coords.
- **Two cookies, read server-side** (`lib/location-store.ts`, a plain module like `lib/units.ts`): `mercury-place` holds the last user-resolved location (coords + label) as URL-encoded JSON; `mercury-geo-asked` records that the prompt was already answered without a place. The client writes them with `document.cookie` (`writePlace` / `writeGeoAsked` in `WeatherView`); the Server Component parses them with `parsePlace`.
- **Restore instead of Prague.** On a bare visit `weather/page.tsx` restores `mercury-place` by fetching its coords with the stored label (no reverse-geocode), flags `source: live`, and titles the page with the remembered name. Only a first-ever bare visit (nothing remembered, never asked) still auto-prompts; after that the pin button is the way in. The Prague fallback is never remembered (`remember` is false for it), so it can't lock itself in.
- **What's persisted.** Any user-resolved live view — geolocation success, a picked suggestion, or an explicit `?q=` search — writes `mercury-place`. A denied / unavailable / errored prompt writes `mercury-geo-asked` so the auto-prompt doesn't fire again.

## Phase 9 — Accessibility pass

Tightening keyboard operability and contrast across the weather view.

- **Keyboard-operable hourly strip.** The horizontal scroll-snap strip was mouse/trackpad-only. `HourlyStrip` is now a small `"use client"` leaf whose scroller is focusable (`tabIndex`, an `aria-label`) and responds to Arrow keys (scroll by ~one tile) and Home/End (jump to the ends); the smooth scroll drops to instant under `prefers-reduced-motion`.
- **Consistent keyboard focus.** The custom dark glass swallowed the browser's default outline, so `globals.css` adds one high-contrast `:focus-visible` ring for all interactive controls (`:where(a, button, [role="button"], [tabindex])`, specificity 0 so a component can still opt into its own treatment — e.g. the search field keeps its `focus-within` ring). Mouse/touch focus stays quiet.
- **Contrast.** A few meaningful data bits sat at `text-zinc-500` (~3.5:1, under AA): the daily low temperature, the conditions-tile detail line, and the footer are bumped to `text-zinc-400`.
- **Auto-prompt kept (deliberate).** With Phase 8 the geolocation prompt already fires at most once (first-ever visit); we kept that rather than going fully pin-only.
- **Dropdown legibility.** The search suggestions used the lightest `.glass` and washed out against the background; they now use `.glass-dark` (deeper base, blurrier) so the candidates read clearly.

## Phase 10 — Mobile responsiveness

Tightening the layout for small (≤375 px) screens; desktop is unchanged (all fixes are gated behind `sm:`).

- **Current-conditions hero.** Was a single `flex-wrap` row of a 96 px icon, a `text-8xl` temperature, and the condition block — it wrapped unpredictably on phones. It now stacks: a smaller icon (`size-20`) and `text-7xl` temperature locked together on one row, with the condition/feels-like/H-L block below; the original side-by-side layout returns at `sm:`.
- **Daily forecast rows.** The fixed columns (day `w-14`, precip `w-12`, two `w-9` temps) plus `gap-3`s summed past a 320 px row's width and forced horizontal overflow. Mobile widths/gaps tightened (`w-11`/`w-9`/`w-8`, `gap-2`), restoring full sizes at `sm:`, so the range bar keeps real room instead of collapsing.
- **Conditions grid.** Tile values drop `text-2xl` → `text-xl` and the grid gap `gap-4` → `gap-3` on mobile so longer values (e.g. "29.92 inHg") aren't cramped in the 2-column layout; both scale back up at `sm:`.
- **Landing wordmark.** The `h1` "Mercury" at `text-8xl` overran the `px-6` padding on narrow phones (clipped by `overflow-hidden`); base size lowered to `text-7xl`, `sm:` and up unchanged.
- **Already-responsive (left as-is).** The two-slot nav search (desktop inline / mobile second row) and the keyboard-scrollable `HourlyStrip` already handled mobile correctly.
- **Note on mobile testing.** A real phone hitting the `next dev` Network URL over the LAN won't hydrate (static HTML renders, client JS never runs — looks like dead buttons + a blank mercury canvas); verify on a production build (`npm run build && npm run start`) or an HTTPS tunnel. Geolocation additionally needs a secure context (HTTPS/localhost), so it only works on the deployed site, not the plain-HTTP LAN address.

## Phase 11 — Tests (Vitest)

Standing up a test runner and a first suite — unit tests over the pure logic plus component tests of the forecast views — a regression net for the formatting/normalization layer and the rendering every view depends on.

- **Runner.** Vitest in a **jsdom** environment (`vitest.config.ts`). `tests/setup.ts` registers jest-dom matchers and runs React Testing Library `cleanup()` after each test. The `@/*` alias resolves from `tsconfig.json` via Vitest's native `resolve.tsconfigPaths`. Scripts: `npm test` (one run), `npm run test:watch`.
  - jsdom is set globally rather than per-file. The pure-logic suites don't need a DOM, but the suite is small enough that the ~0.6 s jsdom startup isn't worth splitting; flip individual files back to node with a `// @vitest-environment node` docblock if that ever changes.
- **Layout.** Specs live under `tests/`, mirroring the `src/` tree (e.g. `tests/lib/weather/provider.test.ts`, `tests/components/DetailsGrid.test.tsx`). They import through `@/*`, so the folder is a convention, not a dependency.
- **Unit coverage.**
  - `format` — every formatter (°C↔°F, km↔mi/mph, hPa↔inHg, rounding, the UV bands).
  - `wmo` — code → condition mapping plus the cloudy fallback for unmapped codes.
  - `units` / `location-store` — the cookie parsers (validation + serialize/parse round-trip, out-of-range/non-finite/wrong-type rejection).
  - `outbound` — the `createLimiter` budget (per-window limits, multi-window rejection, reset after the window elapses, zero-limit), driven with fake timers.
  - `weather/provider` — adapter normalization, tested through the public `getWeatherByCoords` / `getWeatherByQuery` by mocking `cachedFetch` so the network never runs. Verifies the compass mapping, m→km visibility, `pressure_msl` preference, hourly alignment to "Now", "Today" labelling, and `describeRegion`.
  - `useGeolocation` — the permission flow (`renderHook`), stubbing `navigator.geolocation`: idle → locating, the success path forwarding coords, `PERMISSION_DENIED` → `denied`, any other error → `error`, the missing-API `unavailable` branch, and the low-accuracy/timeout options handed to the browser.
  - **Why mock at `cachedFetch`, not deeper.** It keeps the provider's internals (`normalize`, `toCompass`, time slicing) private while still exercising them end-to-end through the boundary — consistent with "normalize at the boundary".
- **Component coverage.** The four forecast views render against the `MOCK_WEATHER` snapshot with React Testing Library:
  - `CurrentConditions` — place/time/condition text and metric **and** imperial temperatures (so the conversion path is covered, not just passthrough).
  - `DetailsGrid` — all eight tiles, their values/descriptors, and imperial conversions (mph / mi / inHg).
  - `HourlyStrip` — "Now" label, one tile per hour, and the keyboard scroller (`ArrowRight` → `scrollBy`, with `matchMedia` + `scrollBy`/`scrollTo` stubbed since jsdom implements none of them).
  - `DailyForecast` — seven rows, "Today" + weekday labels, high/low, and the ≥20 % precipitation threshold (lower values stay hidden).
- **Still manual.** The end-to-end browser permission prompt itself (the native granted/denied dialog) is verified by hand; the hook's handling of each outcome is now unit-tested (see `useGeolocation` above).

## Phase 12 — Bookmarks (saved locations)

Saved locations were originally dropped as out of scope; this phase adds them as a lightweight, client-only convenience. You can star the place you're viewing and jump back to any saved place from a dropdown in the nav.

- **Why localStorage, not a cookie.** The earlier persistence (units, remembered location) lives in cookies for one reason: the Server Component reads them to seed the first paint and avoid a flash. Bookmarks don't have that requirement — they're a navigation list that never changes which forecast renders — and a growing list shouldn't ride along on every request. So they live in **localStorage** (`lib/bookmark-store.ts`), the first such store in the app.
- **`bookmark-store.ts`** — a plain module: `readBookmarks()` / `writeBookmarks(list)` (both guard `window`/`localStorage`, inert on the server), and `placeKey(place)` = rounded `lat,lon` for identity/dedup (matching the app's 3 dp grid). `readBookmarks` validates each entry with the same guards as `parsePlace` and drops malformed ones. A bookmark is a `StoredPlace` (`{ lat, lon, name, region }`, reused from `location-store.ts`) — **only place identity, never weather data**, which would go stale.
- **`useBookmarks` hook** — owns the list state. Starts **empty** and hydrates from `readBookmarks()` in a mount effect (a single read, not a sync loop), so SSR and the first client render agree — no hydration mismatch. Exposes `{ bookmarks, has, toggle, remove }`; `has`/`toggle`/dedup all key off `placeKey`, so saving the same place twice (or a coord within the same grid cell) is a no-op.
- **UI.** `CurrentConditions` gained an optional bookmark toggle beside the place name (filled when saved, `aria-pressed`); it's hidden unless `WeatherView` passes a handler, so the presentational tests keep working. **`BookmarksMenu`** is a new `"use client"` leaf in the nav — a bookmark button opening a `.glass-dark` `listbox` of saved places (styled like the search suggestions), each row navigating on click with a per-row × to remove. It mirrors `LocationSearch`'s ARIA/blur-delay/Escape patterns.
- **Shared navigation.** `WeatherView`'s old `handleSelect` was generalized into **`goToPlace(place)`** (builds `/weather?lat&lon&name&region`), now shared by both a picked suggestion and a bookmark — one navigator, no re-geocode.
- **Tests.** `bookmark-store` (round-trip, malformed/non-array/invalid-entry handling, `placeKey` rounding), `useBookmarks` (hydration, toggle on/off + persistence, grid-cell dedup, remove), and `CurrentConditions` extended for the toggle (hidden without a handler, fires the callback, reflects saved state).
