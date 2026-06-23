# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. Weather data comes from [Open-Meteo](https://open-meteo.com/).

> **Status:** early. The marketing **landing page** is built (a dark hero with an animated liquid-mercury WebGL background); the forecast app itself is in progress. See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the roadmap and [`AGENTS.md`](AGENTS.md) for architecture and conventions.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next)
```

## The landing page

The landing (`src/app/page.tsx`) is a dark, theme-locked hero: the chrome "Mercury" wordmark, a short promo line, and a "Get started" call to action, set over a slowly moving liquid-mercury background.

That background is a hand-built WebGL fragment shader in [`src/components/MercuryBackground.tsx`](src/components/MercuryBackground.tsx) — mercury-style metaballs (drifting droplets that merge into a pool, shaded like polished chrome). It renders at reduced resolution with a capped device-pixel-ratio, honors `prefers-reduced-motion` (falling back to a single static frame), and degrades to a CSS gradient where WebGL is unavailable. The page itself is a Server Component; only the background is a `"use client"` leaf.

## Deploy

Deploys on [Vercel](https://vercel.com/new). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
