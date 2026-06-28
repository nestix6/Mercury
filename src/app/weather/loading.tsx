// Route-level skeleton shown while the Server Component awaits the Open-Meteo
// fetch. Mirrors the weather layout's shape so there's no layout shift when the
// forecast resolves. Shapes only, no spinner.

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-white/5 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="relative flex flex-1 flex-col text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(90%_60%_at_50%_-15%,#171a20_0%,#0c0d11_50%,#070708_100%)]"
      />

      <header className="pt-4">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <nav className="glass-dark w-full rounded-3xl px-4 py-2 sm:px-6 sm:py-2.5">
            <div className="flex items-center gap-4">
              <span className="text-chrome shrink-0 text-xl font-semibold tracking-tight">
                Mercury
              </span>
              {/* Desktop search: input + geolocation pin. */}
              <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
                <Block className="h-10 flex-1 rounded-full" />
                <Block className="size-10 shrink-0 rounded-full" />
              </div>
              {/* Bookmarks button. */}
              <Block className="size-10 shrink-0 rounded-full" />
              {/* Unit toggle. */}
              <Block className="h-9 w-20 shrink-0 rounded-full" />
            </div>
            {/* Mobile search row: input + geolocation pin. */}
            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <Block className="h-10 flex-1 rounded-full" />
              <Block className="size-10 shrink-0 rounded-full" />
            </div>
          </nav>
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-5 py-8 sm:px-8 sm:py-12"
        aria-hidden="true"
      >
        <Block className="h-40 max-w-md rounded-none" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Block key={i} className="h-28" />
          ))}
        </div>
        <Block className="h-32" />
        <Block className="h-80" />
      </div>
    </main>
  );
}
