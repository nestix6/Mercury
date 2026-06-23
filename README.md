# Mercury

A fast, clean weather app. Search a location (or use geolocation) and see current conditions, an hourly strip, and a 7-day forecast. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. Weather data comes from [Open-Meteo](https://open-meteo.com/).

> **Status:** early. The marketing **landing page** and a matching **custom 404** are built (a dark hero with an animated liquid-mercury WebGL background); the forecast app itself is in progress. See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the roadmap and [`AGENTS.md`](AGENTS.md) for architecture and conventions.

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

## Code structure

```
src/
├─ app/
│  ├─ layout.tsx          # root layout: fonts, metadata, dark theme lock
│  ├─ page.tsx            # landing (Server Component)
│  ├─ not-found.tsx       # custom 404 (Server Component)
│  ├─ globals.css         # Tailwind v4, theme tokens, page utilities
│  └─ icon.png            # favicon
├─ components/
│  ├─ MercuryField.tsx    # "use client" mercury background (landing)
│  ├─ MercuryBlob.tsx     # "use client" mercury background (404)
│  └─ mercury-shaders.ts  # WebGL fragment shaders (FRAG_FIELD, FRAG_BLOB)
└─ hooks/
   └─ useMercuryCanvas.ts # shared WebGL setup the backgrounds consume
```

Both backgrounds are hand-built WebGL fragment shaders (mercury metaballs). `useMercuryCanvas` holds the plumbing; the two components are thin client leaves. They render at reduced resolution with a capped device-pixel-ratio, honor `prefers-reduced-motion` (single static frame), and fall back to a CSS gradient where WebGL is unavailable. The pages stay Server Components.

## Deploy

Deploys on [Vercel](https://vercel.com/new). See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
