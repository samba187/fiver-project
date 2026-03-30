import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fiver-black">
      <Image
        src="/images/hero-soccer.jpg"
        alt="Match de football five-a-side sous les projecteurs"
        fill
        className="object-cover opacity-40"
        priority
        sizes="100vw"
      />
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <p className="mb-4 font-[var(--font-heading)] text-sm font-medium uppercase tracking-[0.3em] text-fiver-green">
          Nouakchott &middot; Mauritanie
        </p>
        <h1 className="font-[var(--font-heading)] text-5xl font-bold uppercase leading-tight tracking-tight text-primary-foreground md:text-7xl lg:text-8xl">
          FIVEUR
          <span className="block text-fiver-green">ARENA</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">
          Le premier complexe de football Five-a-Side a Nouakchott.
          Reservez votre terrain en quelques clics.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="#booking"
            className="rounded-sm bg-fiver-green px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90"
          >
            Reserver un terrain
          </Link>
          <Link
            href="/concept"
            className="rounded-sm border border-primary-foreground/20 px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:border-primary-foreground/50"
          >
            Decouvrir le concept
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-primary-foreground/30 p-1">
          <div className="h-2 w-1 animate-bounce rounded-full bg-fiver-green" />
        </div>
      </div>
    </section>
  );
}
