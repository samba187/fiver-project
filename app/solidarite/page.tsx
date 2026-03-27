import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Heart, HandHeart, Users, Lightbulb } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FIVER Solidarity | FIVER Soccer",
  description:
    "Decouvrez les actions solidaires de FIVER Soccer - le football comme vecteur de changement social a Nouakchott.",
};

const ACTIONS = [
  {
    image: "/images/solidarity.jpg",
    title: "Football pour Tous",
    description:
      "Des sessions gratuites pour les enfants des quartiers defavorises. Le football n'a pas de frontieres sociales.",
  },
  {
    image: "/images/solidarity-2.jpg",
    title: "Equipements Solidaires",
    description:
      "Distribution de maillots, chaussures et equipements aux jeunes qui n'ont pas les moyens.",
  },
  {
    image: "/images/solidarity-3.jpg",
    title: "Tournois Communautaires",
    description:
      "Organisation de tournois inter-quartiers pour renforcer les liens et promouvoir le vivre-ensemble.",
  },
];

const STATS = [
  { icon: Heart, value: "200+", label: "Enfants soutenus" },
  { icon: HandHeart, value: "50+", label: "Equipements donnes" },
  { icon: Users, value: "12", label: "Quartiers impliques" },
  { icon: Lightbulb, value: "3", label: "Programmes actifs" },
];

export default function SolidaritePage() {
  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center justify-center bg-fiver-black pt-20">
        <Image
          src="/images/solidarity.jpg"
          alt="Actions solidaires FIVER Soccer"
          fill
          className="object-cover opacity-30"
          priority
          sizes="100vw"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
            Impact Social
          </span>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold uppercase leading-tight tracking-tight text-primary-foreground md:text-6xl">
            FIVER SOLIDARITY
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70">
            Le football comme vecteur de changement social et humain.
            Chaque match est une chance de faire la difference.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-fiver-green py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-fiver-black/60" />
                <p className="font-[var(--font-heading)] text-3xl font-bold text-fiver-black">{stat.value}</p>
                <p className="mt-1 text-sm text-fiver-black/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery of Actions */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Nos Actions
            </span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Le football qui change des vies
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {ACTIONS.map((action) => (
              <div
                key={action.title}
                className="group overflow-hidden rounded-sm border border-border bg-card transition-colors hover:border-fiver-green/30"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={action.image}
                    alt={action.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-[var(--font-heading)] text-base font-semibold uppercase tracking-wide text-foreground">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate CTA */}
      <section className="bg-fiver-black py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Heart className="mx-auto mb-6 h-10 w-10 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-primary-foreground md:text-4xl">
            Soutenez nos actions
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-primary-foreground/60">
            Chaque don contribue a offrir une chance aux jeunes de Nouakchott
            de vivre leur passion du football. Ensemble, faisons la difference.
          </p>
          <button className="mt-8 rounded-sm bg-fiver-green px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
            Faire un don
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
