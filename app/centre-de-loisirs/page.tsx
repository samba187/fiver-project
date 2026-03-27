import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { InscriptionForm } from "@/components/inscription-form";
import Image from "next/image";
import { Star, Users, Calendar, Award, Shield, Heart, Zap, Trophy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centre de Loisirs U9-U15 | FIVER Soccer",
  description:
    "Inscrivez votre enfant au Centre de Loisirs FIVER Soccer - programmes U9 à U15 avec encadrement professionnel à Nouakchott.",
};

const CATEGORIES = [
  {
    name: "U9",
    age: "6-8 ans",
    description: "Découverte du football, psychomotricité et plaisir du jeu en petits groupes.",
    sessions: "Mer & Sam · 10h-11h30",
    spots: 16,
    color: "from-emerald-500 to-green-600",
  },
  {
    name: "U12",
    age: "9-11 ans",
    description: "Apprentissage des fondamentaux techniques et début du jeu collectif structuré.",
    sessions: "Mer & Sam · 11h30-13h",
    spots: 16,
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "U13",
    age: "11-12 ans",
    description: "Perfectionnement technique, initiation tactique et préparation physique adaptée.",
    sessions: "Mer & Sam · 14h-15h30",
    spots: 16,
    color: "from-emerald-600 to-teal-600",
  },
  {
    name: "U15",
    age: "13-15 ans",
    description: "Entraînement intensif, compétitions inter-centres et préparation mentale avancée.",
    sessions: "Mer & Sam · 15h30-17h",
    spots: 16,
    color: "from-teal-500 to-emerald-600",
  },
];

const HIGHLIGHTS = [
  { icon: Star, title: "Encadrement Pro", description: "Éducateurs diplômés et passionnés par la formation des jeunes" },
  { icon: Users, title: "Petits Groupes", description: "Maximum 16 joueurs par session pour un suivi individualisé" },
  { icon: Calendar, title: "2 Séances / Semaine", description: "Mercredi et samedi — un rythme régulier et adapté" },
  { icon: Award, title: "Compétitions", description: "Tournois inter-centres réguliers pour vivre la compétition" },
];

const VALUES = [
  { icon: Heart, title: "Passion", description: "Transmettre l'amour du football dès le plus jeune âge" },
  { icon: Shield, title: "Respect", description: "Apprendre le fair-play et le respect des règles et des autres" },
  { icon: Zap, title: "Progression", description: "Voir chaque enfant grandir et s'améliorer semaine après semaine" },
  { icon: Trophy, title: "Plaisir", description: "Avant tout, le football reste un jeu et une source de bonheur" },
];

export default function CentreDeLoisirs() {
  return (
    <main className="overflow-hidden">
      <Navigation />

      {/* Hero — Full Green Impact */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 pt-20">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="float-gentle absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5" />
          <div className="float-gentle absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5" style={{ animationDelay: '2s' }} />
          <div className="float-gentle absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/5" style={{ animationDelay: '4s' }} />
          {/* Soccer ball pattern dots */}
          <div className="absolute right-10 top-28 h-3 w-3 rounded-full bg-white/10" />
          <div className="absolute right-32 top-44 h-2 w-2 rounded-full bg-white/10" />
          <div className="absolute left-20 bottom-32 h-4 w-4 rounded-full bg-white/10" />
          <div className="absolute left-44 bottom-48 h-2 w-2 rounded-full bg-white/10" />
        </div>

        <div className="hero-fade relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/90">Inscriptions ouvertes</span>
          </div>
          <h1 className="font-[var(--font-heading)] text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl lg:text-8xl">
            CENTRE DE
            <br />
            <span className="text-fiver-black">LOISIRS</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            Des programmes sportifs sur mesure pour les jeunes de <strong className="text-white">9 à 15 ans</strong>.
            Encadrement professionnel, développement technique et valeurs humaines.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#inscription" className="rounded-sm bg-fiver-black px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-green shadow-lg transition-transform hover:scale-105">
              Inscrire mon enfant
            </a>
            <a href="#categories" className="rounded-sm border-2 border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              Voir les catégories
            </a>
          </div>
        </div>
      </section>

      {/* Highlights Strip */}
      <section className="bg-fiver-black py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="stagger-card group flex items-start gap-4 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-5 transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories — Vivid Cards */}
      <section id="categories" className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-14 text-center">
            <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Programmes
            </span>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-5xl">
              Nos Catégories
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Chaque catégorie est adaptée au niveau et à l'âge des enfants pour une progression optimale.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="stagger-card group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${cat.color}`} />
                <div className="flex gap-5 p-6 pl-7">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cat.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <span className="font-[var(--font-heading)] text-xl font-bold text-white">{cat.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-foreground">{cat.name}</h3>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">{cat.age}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cat.description}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <Calendar className="h-3.5 w-3.5" /> {cat.sessions}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {cat.spots} places
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-fiver-black py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-14 text-center">
            <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Nos Valeurs
            </span>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
              Plus qu&apos;un sport, une école de vie
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((val) => (
              <div key={val.title} className="stagger-card group text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 transition-transform group-hover:scale-110">
                  <val.icon className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="font-[var(--font-heading)] text-sm font-bold uppercase tracking-wide text-white">{val.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-white/50">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inscription Form — Green CTA */}
      <section id="inscription" className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 py-20">
        <div className="absolute inset-0">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
        </div>
        <div className="relative mx-auto max-w-lg px-4 lg:px-8">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-black/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
              Inscription
            </span>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
              Inscrire mon enfant
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Remplissez le formulaire et nous vous contacterons pour finaliser l&apos;inscription.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-2xl shadow-black/20 md:p-8">
            <InscriptionForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
