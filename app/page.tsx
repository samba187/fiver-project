import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { BookingFlow } from "@/components/booking-flow";
import { Footer } from "@/components/footer";
import { Trophy, Users, Clock, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    icon: Trophy,
    title: "2 Terrains Pro",
    description: "Gazon synthetique derniere generation pour une experience de jeu optimale.",
  },
  {
    icon: Users,
    title: "Academie Jeunes",
    description: "Programme U9 a U15 pour former les talents de demain.",
  },
  {
    icon: Clock,
    title: "Creneaux Flexibles",
    description: "Reservez du lundi au dimanche, de 16h a minuit.",
  },
  {
    icon: Shield,
    title: "Securite & Qualite",
    description: "Installations aux normes avec eclairage professionnel.",
  },
];

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />

      {/* Booking Section */}
      <section id="booking" className="bg-neutral-300 dark:bg-neutral-900 py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="mb-2 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Reservation
            </span>
          </div>
          <h2 className="mb-10 text-center font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
            Reservez votre terrain
          </h2>
          <div className="rounded-lg border border-border bg-neutral-200 dark:bg-neutral-800 p-6 shadow-sm md:p-10">
            <BookingFlow />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-fiver-black py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-2 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Pourquoi FIVEUR
            </span>
          </div>
          <h2 className="mb-12 text-center font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-primary-foreground md:text-4xl">
            Une experience unique
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-fiver-green/10">
                  <feature.icon className="h-6 w-6 text-fiver-green" />
                </div>
                <h3 className="font-[var(--font-heading)] text-base font-semibold uppercase tracking-wide text-primary-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solidarity Teaser */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:gap-16">
            <div className="flex-1">
              <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
                Solidarite
              </span>
              <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
                FIVEUR Solidarity
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Le football comme vecteur de changement social.
                Decouvrez nos actions solidaires et humanitaires
                au coeur de la communaute.
              </p>
              <Link
                href="/solidarite"
                className="mt-6 inline-block rounded-sm bg-fiver-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90"
              >
                Decouvrir nos actions
              </Link>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-sm lg:flex-1">
              <Image
                src="/images/solidarity.jpg"
                alt="Actions solidaires FIVER"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
