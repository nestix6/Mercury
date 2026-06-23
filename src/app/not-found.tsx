import Link from "next/link";
import MercuryBlob from "@/components/MercuryBlob";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#070708] text-zinc-100">
      {/* Single mercury blob behind the 404. CSS gradient is the no-WebGL fallback. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_50%,#15181e_0%,#0a0b0e_55%,#060607_100%)]">
        <MercuryBlob />
      </div>

      {/* Legibility scrim behind the centered text. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(48%_44%_at_50%_46%,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_45%,transparent_72%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-chrome animate-rise text-9xl leading-none font-semibold tracking-tight [animation-delay:80ms] sm:text-[11rem] md:text-[14rem]">
          404
        </h1>

        <p className="animate-rise mt-2 text-xl font-medium text-zinc-100 [animation-delay:160ms] sm:text-2xl">
          Page not found
        </p>

        <p className="animate-rise mt-3 max-w-md text-base leading-relaxed text-zinc-400 [animation-delay:220ms]">
          The page you are looking for does not exist or may have moved.
        </p>

        <div className="animate-rise mt-9 [animation-delay:300ms]">
          <Link
            href="/"
            className="group relative inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-white via-zinc-100 to-zinc-300 px-8 text-base font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_30px_rgba(0,0,0,0.45)] transition-[transform,filter] duration-200 hover:brightness-[1.04] active:translate-y-px active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-200"
          >
            <span
              aria-hidden="true"
              className="mr-2 transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              &larr;
            </span>
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
