"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Tarifs } from "./page";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

export function TabParametres({ tarifs, setTarifs }: { tarifs: Tarifs; setTarifs: (t: Tarifs) => void }) {
  const [saved, setSaved] = useState(false);

  async function save() {
    const value = JSON.stringify(tarifs);
    const { data } = await supabase.from("settings").select("key").eq("key", "academy_tarifs").limit(1);
    if (data && data.length > 0) {
      await supabase.from("settings").update({ value }).eq("key", "academy_tarifs");
    } else {
      await supabase.from("settings").insert({ key: "academy_tarifs", value });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      
      {/* Tarification */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💰 Tarification mensuelle</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Tarif Football (MRU)</label>
              <input type="number" value={tarifs.tarifFoot} onChange={e => setTarifs({ ...tarifs, tarifFoot: parseInt(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Tarif Loisirs (MRU)</label>
              <input type="number" value={tarifs.tarifLoisirs} onChange={e => setTarifs({ ...tarifs, tarifLoisirs: parseInt(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Tarif Combo (MRU)</label>
              <input type="number" value={tarifs.tarifCombo} onChange={e => setTarifs({ ...tarifs, tarifCombo: parseInt(e.target.value) || 0 })} className={inputClass} />
              <p className="mt-1 text-[10px] text-white/30">Facturé si inscrit Foot + Loisirs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Frais d'inscription */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">🎟️ Frais d'inscription (One-time)</h2>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Montant des frais d'inscription (MRU)</label>
          <input type="number" value={tarifs.fraisInscription} onChange={e => setTarifs({ ...tarifs, fraisInscription: parseInt(e.target.value) || 0 })} className={inputClass} />
          <p className="mt-1 text-[10px] text-white/30">Facturé une seule fois à la première inscription de chaque enfant.</p>
        </div>
      </div>

      {/* Règles de paiement */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Règles de paiement mensuel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Jour limite de paiement</label>
            <input type="number" min={1} max={28} value={tarifs.jourLimitePaiement} onChange={e => setTarifs({ ...tarifs, jourLimitePaiement: Math.min(28, Math.max(1, parseInt(e.target.value) || 10)) })} className={inputClass} />
            <p className="mt-1 text-[10px] text-white/30">Tous les inscrits doivent payer entre le 1er et ce jour. Passé ce jour → en retard.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Seuil "Fin de mois" (jour)</label>
            <input type="number" min={15} max={31} value={tarifs.seuilFinDeMois} onChange={e => setTarifs({ ...tarifs, seuilFinDeMois: Math.min(31, Math.max(15, parseInt(e.target.value) || 25)) })} className={inputClass} />
            <p className="mt-1 text-[10px] text-white/30">Inscription après ce jour → 1er paiement reporté au mois suivant.</p>
          </div>
        </div>
      </div>

      {/* Résumé des règles */}
      <div className="rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-5">
        <h3 className="mb-3 font-[var(--font-heading)] text-xs font-bold uppercase tracking-widest text-fiver-green">📋 Résumé des règles actives</h3>
        <ul className="flex flex-col gap-2 text-xs text-white/60">
          <li>⚽ Football seul : <strong className="text-white">{tarifs.tarifFoot.toLocaleString()} MRU/mois</strong></li>
          <li>🎯 Loisirs seul : <strong className="text-white">{tarifs.tarifLoisirs.toLocaleString()} MRU/mois</strong></li>
          <li>🔥 Combo Foot + Loisirs : <strong className="text-white">{tarifs.tarifCombo.toLocaleString()} MRU/mois</strong></li>
          <li>🎟️ Frais d'inscription (1ère fois) : <strong className="text-white">{tarifs.fraisInscription.toLocaleString()} MRU</strong></li>
          <li>📅 Paiement dû entre le <strong className="text-white">1er</strong> et le <strong className="text-white">{tarifs.jourLimitePaiement}</strong> du mois</li>
          <li>🔴 En retard à partir du <strong className="text-red-400">{tarifs.jourLimitePaiement + 1}</strong> du mois</li>
          <li>📝 Inscription après le <strong className="text-amber-400">{tarifs.seuilFinDeMois}</strong> → 1er paiement mois suivant</li>
        </ul>
      </div>

      <button onClick={save} className="flex items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
        {saved ? (<><Check className="h-4 w-4" /> Sauvegardé !</>) : (<><Save className="h-4 w-4" /> Enregistrer les paramètres</>)}
      </button>
    </div>
  );
}
