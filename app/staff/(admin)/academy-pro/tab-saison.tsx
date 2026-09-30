"use client";

import { useState } from "react";
import { CalendarRange, Archive, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Saison } from "./page";
import { NouvelleSaisonModal } from "./nouvelle-saison";

export function TabSaison({
  saisons,
  saisonCourante,
  onRefresh,
}: {
  saisons: Saison[];
  saisonCourante: string;
  onRefresh: (nouvelleSaison?: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const saisonActive = saisons.find(s => s.nom === saisonCourante);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Saison en cours</h2>
        </div>
        <p className="font-[var(--font-heading)] text-3xl font-bold text-fiver-green">{saisonCourante}</p>
        {saisonActive?.date_debut && (
          <p className="mt-1 text-xs text-white/40">
            Du {new Date(saisonActive.date_debut).toLocaleDateString("fr-FR")}
            {saisonActive.date_fin ? ` au ${new Date(saisonActive.date_fin).toLocaleDateString("fr-FR")}` : ""}
          </p>
        )}
        <button
          onClick={() => setModalOpen(true)}
          className="mt-5 flex items-center gap-2 rounded-sm bg-fiver-green px-5 py-3 text-sm font-bold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nouvelle saison
        </button>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Comment ça marche</h3>
        <ul className="flex flex-col gap-2 text-xs text-white/60">
          <li>— <strong className="text-white">Nouvelle saison</strong> crée la saison suivante, vide, et en fait tout de suite la saison en cours.</li>
          <li>— Dans Inscriptions, <strong className="text-white">Importer</strong> reprend les enfants de la saison précédente que vous choisissez : même carte QR, photo et infos, tarif ancien inscrit, catégorie mise à jour selon l&apos;âge. Vous pouvez importer en plusieurs fois.</li>
          <li>— Les nouveaux enfants s&apos;inscrivent avec le formulaire habituel.</li>
          <li>— Les saisons passées restent consultables avec le sélecteur en haut de page. Rien n&apos;est supprimé.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive className="h-4 w-4 text-white/40" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Historique des saisons</h2>
        </div>
        <div className="flex flex-col gap-2">
          {saisons.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-sm border border-white/5 bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">{s.nom}</p>
                {s.date_debut && (
                  <p className="text-[11px] text-white/30">
                    {new Date(s.date_debut).toLocaleDateString("fr-FR")}
                    {s.date_fin ? ` → ${new Date(s.date_fin).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                )}
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                s.nom === saisonCourante ? "bg-fiver-green/15 text-fiver-green" : "bg-white/5 text-white/40"
              )}>
                {s.nom === saisonCourante ? "En cours" : "Archivée"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <NouvelleSaisonModal
          saisonCourante={saisonCourante}
          saisons={saisons}
          onClose={() => setModalOpen(false)}
          onDone={(n) => { setModalOpen(false); onRefresh(n); }}
        />
      )}
    </div>
  );
}
