import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Users, Target, Shield, Calendar, Star, Flame, Medal, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiveur Academy | Club de Football - Nouakchott",
  description:
    "Rejoignez la Fiveur Academy, le club de football de Nouakchott. Formation, compétitions et développement des jeunes talents.",
};

const PILLARS = [
  { icon: Trophy, title: "Excellence", description: "Viser le plus haut niveau à travers un programme d'entraînement exigeant et structuré." },
  { icon: Users, title: "Esprit d'équipe", description: "Développer la cohésion, le respect et la solidarité entre les joueurs." },
  { icon: Target, title: "Progression", description: "Un suivi personnalisé pour que chaque joueur atteigne son plein potentiel." },
  { icon: Shield, title: "Discipline", description: "Rigueur sur et en dehors du terrain pour former de vrais compétiteurs." },
];

const TEAMS = [
  { name: "U7", age: "5-6 ans", training: "Mer & Sam — 10h-11h", gradient: "from-pink-500 to-rose-500" },
  { name: "U9", age: "7-8 ans", training: "Mer & Sam — 11h-12h30", gradient: "from-purple-500 to-violet-500" },
  { name: "U11", age: "9-10 ans", training: "Lun, Mer, Ven — 16h-17h30", gradient: "from-blue-500 to-cyan-500" },
  { name: "U13", age: "11-12 ans", training: "Lun, Mer, Ven — 17h-18h30", gradient: "from-emerald-500 to-green-500" },
  { name: "U15", age: "13-14 ans", training: "Mar, Jeu, Sam — 17h-18h30", gradient: "from-amber-500 to-orange-500" },
  { name: "U17", age: "15-16 ans", training: "Mar, Jeu, Sam — 18h30-20h", gradient: "from-red-500 to-rose-500" },
];



export default function AcademyPage() {
  return (
    <main className="overflow-hidden">
      <Navigation />

      {/* Hero — Dark Premium */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-fiver-black pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <Image src="/images/hero-soccer.jpg" alt="Fiveur Academy" fill className="object-cover opacity-10" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-fiver-black via-fiver-black/80 to-fiver-black" />
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-fiver-green/5 blur-3xl" />
          <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-fiver-green/5 blur-3xl" />
        </div>

        <div className="hero-fade relative z-10 mx-auto max-w-4xl px-4 text-center">
          {/* Club Logo */}
          <div className="mx-auto mb-8 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-white shadow-2xl shadow-fiver-green/10 md:h-44 md:w-44">
            <Image
              src="/images/fiveur-academy-logo.png"
              alt="Fiveur Academy Logo"
              width={176}
              height={176}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <h1 className="font-[var(--font-heading)] text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl lg:text-8xl">
            FIVEUR
            <br />
            <span className="bg-gradient-to-r from-fiver-green via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              ACADEMY
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Le club de football qui forme les <strong className="text-white">champions de demain</strong>.
            Rejoignez l&apos;aventure et développez votre talent.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact" className="group flex items-center gap-2 rounded-sm bg-fiver-green px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black shadow-lg shadow-fiver-green/20 transition-transform hover:scale-105">
              Rejoindre le club <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#equipes" className="rounded-sm border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/10">
              Voir les équipes
            </a>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-14 text-center">
            <span className="inline-block rounded-full bg-fiver-green/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-fiver-green">
              Philosophie
            </span>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-5xl">
              Nos Piliers
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((item) => (
              <div key={item.title} className="stagger-card group flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center transition-all duration-300 hover:border-fiver-green/30 hover:shadow-lg hover:shadow-fiver-green/5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fiver-green/10 transition-transform group-hover:scale-110">
                  <item.icon className="h-7 w-7 text-fiver-green" />
                </div>
                <h3 className="font-[var(--font-heading)] text-base font-bold uppercase tracking-wide text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section id="equipes" className="bg-fiver-black py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-14 text-center">
            <span className="inline-block rounded-full bg-fiver-green/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-fiver-green">
              Nos Équipes
            </span>
            <h2 className="mt-4 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-white md:text-5xl">
              Catégories
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/50">
              De l&apos;initiation chez les jeunes à la compétition chez les seniors, trouvez votre équipe.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {TEAMS.map((team) => (
              <div key={team.name} className="stagger-card group relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] transition-all duration-300 hover:border-fiver-green/20 hover:bg-white/[0.04]">
                <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${team.gradient}`} />
                <div className="flex items-center gap-5 p-6 pl-7">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${team.gradient} shadow-lg transition-transform group-hover:scale-105`}>
                    <span className="font-[var(--font-heading)] text-xl font-bold text-white">{team.name}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-wide text-white">{team.name}</h3>
                    <p className="mt-0.5 text-sm text-white/50">{team.age}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-fiver-green">
                      <Calendar className="h-3.5 w-3.5" /> {team.training}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-fiver-black via-fiver-black to-fiver-black py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fiver-green/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Flame className="mx-auto mb-4 h-10 w-10 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Prêt à rejoindre la<br />
            <span className="text-fiver-green">Fiveur Academy</span> ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
            Que vous soyez débutant ou confirmé, notre staff technique vous accompagnera
            dans votre progression. Contactez-nous pour intégrer l&apos;une de nos équipes.
          </p>
          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 rounded-sm bg-fiver-green px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black shadow-lg shadow-fiver-green/20 transition-transform hover:scale-105">
            <Medal className="h-4 w-4" /> Nous contacter
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
