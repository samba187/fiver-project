import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Handshake, Building2, Megaphone, Trophy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partenaires | FIVEUR ARENA",
  description:
    "Decouvrez les partenaires de FIVEUR ARENA et rejoignez-nous en tant que sponsor du premier complexe Five-a-Side a Nouakchott.",
};

const PARTNERS = [
  { name: "SportEquip Mauritanie", category: "Equipementier" },
  { name: "Banque Nationale", category: "Finance" },
  { name: "TeleMauritanie", category: "Media" },
  { name: "AgroPlus", category: "Agroalimentaire" },
  { name: "TransMauritanie", category: "Transport" },
  { name: "MedSante", category: "Sante" },
];

const BENEFITS = [
  {
    icon: Megaphone,
    title: "Visibilite",
    description: "Votre logo sur nos terrains, maillots et supports digitaux. Touchez une audience passionnee.",
  },
  {
    icon: Building2,
    title: "Image de Marque",
    description: "Associez votre marque a un projet sportif et social qui fait la difference a Nouakchott.",
  },
  {
    icon: Trophy,
    title: "Evenements Exclusifs",
    description: "Acces prioritaire pour organiser vos evenements corporate et team-building sur nos terrains.",
  },
  {
    icon: Handshake,
    title: "Reseau",
    description: "Rejoignez un ecosysteme de partenaires partageant les memes valeurs de sport et solidarite.",
  },
];

export default function PartenairesPage() {
  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="flex min-h-[50vh] items-center justify-center bg-fiver-black pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
            Ensemble
          </span>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold uppercase leading-tight tracking-tight text-primary-foreground md:text-6xl">
            NOS PARTENAIRES
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70">
            Ils nous font confiance et contribuent a faire de FIVEUR ARENA
            un lieu d'excellence sportive et sociale.
          </p>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Ils nous soutiennent
            </span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Nos partenaires
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {PARTNERS.map((partner) => (
              <div
                key={partner.name}
                className="flex flex-col items-center justify-center rounded-sm border border-border bg-card p-8 text-center transition-colors hover:border-fiver-green/30"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <span className="font-[var(--font-heading)] text-xl font-bold uppercase text-fiver-green">
                    {partner.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-foreground">
                  {partner.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{partner.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-fiver-black py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
              Avantages
            </span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-primary-foreground md:text-4xl">
              Pourquoi devenir partenaire
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-sm border border-primary-foreground/10 p-6 text-center transition-colors hover:border-fiver-green/30"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-fiver-green/10">
                  <benefit.icon className="h-5 w-5 text-fiver-green" />
                </div>
                <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-primary-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/60">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-fiver-green py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-fiver-black md:text-4xl">
            Rejoignez l'aventure
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-fiver-black/70">
            Devenez partenaire de FIVEUR ARENA et associez votre marque
            a un projet qui compte.
          </p>
          <a
            href="/contact"
            className="mt-8 inline-block rounded-sm bg-fiver-black px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-fiver-green transition-opacity hover:opacity-90"
          >
            Devenir partenaire
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
