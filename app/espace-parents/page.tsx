"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ConnexionParent } from "@/components/espace-parents/connexion";
import { EspaceParent } from "@/components/espace-parents/espace";
import { chargerDonneesParent, deconnexionParent, sessionParent, SessionExpiree, type DonneesParent } from "@/lib/parents";

export default function EspaceParentsPage() {
  const [etat, setEtat] = useState<"chargement" | "connexion" | "pret" | "erreur">("chargement");
  const [donnees, setDonnees] = useState<DonneesParent | null>(null);

  const charger = useCallback(async () => {
    if (!sessionParent.get()) { setEtat("connexion"); return; }
    try {
      setDonnees(await chargerDonneesParent());
      setEtat("pret");
    } catch (e) {
      setEtat(e instanceof SessionExpiree ? "connexion" : "erreur");
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Données à jour quand le parent revient sur l'onglet (validation d'un paiement, message de l'académie…)
  useEffect(() => {
    const surRetour = () => { if (document.visibilityState === "visible" && sessionParent.get()) charger(); };
    document.addEventListener("visibilitychange", surRetour);
    return () => document.removeEventListener("visibilitychange", surRetour);
  }, [charger]);

  async function deconnexion() {
    await deconnexionParent();
    setDonnees(null);
    setEtat("connexion");
  }

  return (
    <main className="min-h-[100dvh] bg-fiver-black text-white">
      {etat === "chargement" && (
        <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-fiver-green" /></div>
      )}
      {etat === "connexion" && <ConnexionParent onConnecte={() => { setEtat("chargement"); charger(); }} />}
      {etat === "erreur" && (
        <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-white/70">Impossible de charger votre espace. Vérifiez votre connexion internet.</p>
          <button onClick={() => { setEtat("chargement"); charger(); }} className="rounded-lg bg-fiver-green px-6 py-3 text-sm font-bold text-fiver-black">Réessayer</button>
        </div>
      )}
      {etat === "pret" && donnees && <EspaceParent donnees={donnees} onRecharger={charger} onDeconnexion={deconnexion} />}
    </main>
  );
}
