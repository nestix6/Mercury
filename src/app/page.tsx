import Link from "next/link";
import MercuryBackground from "@/components/MercuryBackground";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#070708] text-zinc-100">
      {/* Liquid-mercury field. CSS gradient underneath is the no-WebGL fallback. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_82%,#1a1d22_0%,#0b0c0f_55%,#060607_100%)]">
        <MercuryBackground />
      </div>

      {/* Legibility scrim: soft dark wash behind the centered content. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_46%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.28)_45%,transparent_72%)]" />

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pt-12 pb-24 text-center sm:pt-16">
        <p className="glass mb-8 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium tracking-wide text-zinc-100 animate-rise [animation-delay:60ms]">
          Live weather, refined
        </p>

        <h1 className="text-chrome animate-rise text-8xl leading-[0.95] font-semibold tracking-tight [animation-delay:140ms] sm:text-9xl md:text-[10rem] lg:text-[11rem]">
          Mercury
        </h1>

        <p className="animate-rise mt-8 max-w-2xl text-balance text-xl leading-relaxed text-zinc-100/90 [animation-delay:240ms] sm:text-2xl">
          Current conditions, an hourly view, and a seven-day forecast for
          anywhere. Fast, calm, and accurate.
        </p>

        <div className="animate-rise mt-12 [animation-delay:340ms]">
          <div className="cta-ring inline-flex rounded-full p-5">
            <Link
              href="/"
              className="group relative z-10 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-white via-zinc-100 to-zinc-300 px-8 text-base font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_30px_rgba(0,0,0,0.45)] transition-[transform,filter] duration-200 hover:brightness-[1.04] active:translate-y-px active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-200"
            >
              Get started
              <span
                aria-hidden="true"
                className="ml-2 transition-transform duration-200 group-hover:translate-x-0.5"
              >
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pb-7 text-xs text-zinc-500 sm:px-10">
        <span>&copy; 2026 Mercury</span>
        <span>Weather data by Open-Meteo</span>
      </footer>
    </main>
  );
}
