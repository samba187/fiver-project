import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Target, Zap, Heart, Globe } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concept | FIVEUR ARENA",
  description:
    "Decouvrez le concept FIVEUR ARENA - le premier complexe Five-a-Side a Nouakchott avec deux terrains professionnels.",
};

const VALUES = [
  {
    icon: Target,
    title: "Excellence",
    description:
      "Des installations haut de gamme avec gazon synthetique professionnel et eclairage LED.",
  },
  {
    icon: Zap,
    title: "Accessibilite",
    description:
      "Un systeme de reservation simple et des tarifs accessibles pour tous les joueurs.",
  },
  {
    icon: Heart,
    title: "Communaute",
    description:
      "Plus qu'un terrain, un lieu de rencontre pour les passionnes de football.",
  },
  {
    icon: Globe,
    title: "Impact Social",
    description:
      "Des actions solidaires et une academie jeunes pour contribuer au developpement local.",
  },
];

export default function ConceptPage() {
  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center bg-fiver-black pt-20">
        <Image
          src="/images/concept-pitch.jpg"
          alt="Vue aerienne du complexe FIVEUR ARENA"
          fill
          className="object-cover opacity-30"
          priority
          sizes="100vw"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
            Notre Vision
          </span>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold uppercase leading-tight tracking-tight text-primary-foreground md:text-6xl">
            LE CONCEPT FIVEUR ARENA
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70">
            Creer un espace sportif d'excellence a Nouakchott, ou le football
            Five-a-Side devient une experience accessible, sociale et formatrice.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
            <div className="flex-1">
              <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
                L'Histoire
              </span>
              <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
                Ne d'une passion
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                FIVEUR ARENA est ne de la volonte de creer un lieu unique a
                Nouakchott, ou amateurs et passionnes peuvent pratiquer le
                football dans des conditions professionnelles. Notre complexe
                offre deux terrains de derniere generation, un eclairage
                optimal et une ambiance incomparable.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Au-dela du sport, FIVER est un projet social qui vise a former
                la jeunesse mauritanienne et a renforcer les liens communautaires
                a travers le football.
              </p>
            </div>
            <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-sm lg:flex-1">
              <Image
                src="/images/concept-pitch.jpg"
                alt="Terrain de football FIVEUR ARENA"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-fiver-black py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Nos Valeurs
            </span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-primary-foreground md:text-4xl">
              Ce qui nous anime
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-sm border border-primary-foreground/10 p-6 text-center transition-colors hover:border-fiver-green/30"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-fiver-green/10">
                  <value.icon className="h-5 w-5 text-fiver-green" />
                </div>
                <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-primary-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/60">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installations */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Nos Installations
            </span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Deux terrains d'exception
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              <div className="relative aspect-video">
                <Image
                  src="/images/hero-soccer.jpg"
                  alt="Terrain 1 de FIVEUR ARENA"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="p-6">
                <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-wide text-foreground">
                  Terrain 1
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Gazon synthetique 40mm, eclairage LED professionnel,
                  filets de protection. Ideal pour les matchs competitifs.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              <div className="relative aspect-video">
                <Image
                  src="/images/concept-pitch.jpg"
                  alt="Terrain 2 de FIVEUR ARENA"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="p-6">
                <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-wide text-foreground">
                  Terrain 2
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Gazon synthétique 40mm et éclairage LED strictement identiques.
                  Les deux terrains offrent exactement la même qualité d'exception.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-fiver-green py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-fiver-black md:text-4xl">
            Pret a jouer ?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-fiver-black/70">
            Reservez votre creneau des maintenant et profitez de nos installations.
          </p>
          <Link
            href="/#booking"
            className="mt-8 inline-block rounded-sm bg-fiver-black px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-fiver-green transition-opacity hover:opacity-90"
          >
            Reserver maintenant
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
