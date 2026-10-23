"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Phone, Baby, AlertCircle } from "lucide-react";
import { connexionParent } from "@/lib/parents";

const champ = "w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-base text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none";

function Champ({ icon: Icon, ...props }: { icon: typeof Phone } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
      <input {...props} className={champ} />
    </div>
  );
}

// Connexion simple : numéro donné à l'inscription + prénom d'un de ses enfants
export function ConnexionParent({ onConnecte }: { onConnecte: () => void }) {
  const [telephone, setTelephone] = useState("");
  const [prenom, setPrenom] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await connexionParent(telephone, prenom);
      onConnecte();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
    setChargement(false);
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-8">
      <Link href="/" className="mx-auto mb-8">
        <Image src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" width={88} height={88} className="h-20 w-20 rounded-full bg-white object-cover" />
      </Link>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-fiver-green">Fiveur Academy</p>
      <h1 className="mt-1 text-center font-[var(--font-heading)] text-3xl font-bold uppercase text-white">Espace Parents</h1>

      <form onSubmit={valider} className="mt-8 flex flex-col gap-3">
        <Champ icon={Phone} type="tel" inputMode="tel" autoComplete="tel" required placeholder="Numéro de téléphone" value={telephone} onChange={e => setTelephone(e.target.value)} />
        <Champ icon={Baby} required autoComplete="off" autoCapitalize="words" placeholder="Prénom de votre enfant" value={prenom} onChange={e => setPrenom(e.target.value)} />

        <p className="text-xs text-white/40">
          Utilisez le numéro donné à l&apos;inscription. Tous vos enfants inscrits avec ce numéro apparaîtront dans votre espace.
        </p>

        {erreur && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
          </div>
        )}

        <button type="submit" disabled={chargement} className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-fiver-green py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50">
          {chargement && <Loader2 className="h-4 w-4 animate-spin" />}
          Accéder à mon espace
        </button>
      </form>

      <div className="mt-auto flex items-center justify-center gap-4 pt-12 text-xs text-white/30">
        <Link href="/staff" className="hover:text-white/60">Accès coach</Link>
        <span>·</span>
        <Link href="/staff" className="hover:text-white/60">Accès admin</Link>
      </div>
    </div>
  );
}
