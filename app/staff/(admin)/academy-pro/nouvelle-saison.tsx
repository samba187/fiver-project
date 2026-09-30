"use client";

import { useState } from "react";
import { Loader2, X as XIcon, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { suggestNextSaison } from "@/lib/academy";
import type { Saison } from "./page";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

/**
 * Crée la saison suivante (vide) et en fait tout de suite la saison en cours.
 * Chaque étape est rejouable : si ça coupe au milieu, on relance et ça termine.
 * La saison courante n'est basculée qu'à la toute fin.
 */
export async function lancerSaison(ancienne: string, nouvelle: string, saisons: Saison[]) {
  const existante = saisons.find(s => s.nom === nouvelle);
  if (existante?.statut === "archivee") throw new Error(`La saison ${nouvelle} est déjà archivée.`);

  if (!existante) {
    const y = parseInt(nouvelle.slice(0, 4), 10);
    const { error } = await supabase.from("saisons").insert({
      nom: nouvelle,
      date_debut: Number.isNaN(y) ? null : `${y}-10-01`,
      date_fin: Number.isNaN(y) ? null : `${y + 1}-09-30`,
      statut: "active",
    });
    if (error) throw error;
  }

  if (ancienne && ancienne !== nouvelle) {
    const { error: eArch } = await supabase
      .from("saisons")
      .update({ statut: "archivee", archived_at: new Date().toISOString() })
      .eq("nom", ancienne);
    if (eArch) throw eArch;

    // Un compte parent navette est unique (téléphone) : il suit la saison en cours
    const { error: eNav } = await supabase.from("transport_parents").update({ saison: nouvelle }).eq("saison", ancienne);
    if (eNav) throw eNav;
  }

  const { data: existing } = await supabase.from("settings").select("key").eq("key", "saison_courante").limit(1);
  const { error: eSet } = existing && existing.length > 0
    ? await supabase.from("settings").update({ value: nouvelle }).eq("key", "saison_courante")
    : await supabase.from("settings").insert({ key: "saison_courante", value: nouvelle });
  if (eSet) throw eSet;
}

export function NouvelleSaisonModal({
  saisonCourante,
  saisons,
  onClose,
  onDone,
}: {
  saisonCourante: string;
  saisons: Saison[];
  onClose: () => void;
  onDone: (nouvelle: string) => void;
}) {
  const [nom, setNom] = useState(suggestNextSaison(saisonCourante));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function valider() {
    const n = nom.trim();
    if (!n) { setError("Donnez un nom à la saison."); return; }
    if (n === saisonCourante) { setError(`${n} est déjà la saison en cours.`); return; }
    setSaving(true);
    setError("");
    try {
      await lancerSaison(saisonCourante, n, saisons);
      onDone(n);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Une erreur est survenue. Vous pouvez relancer, rien ne sera fait en double.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#111] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Nouvelle saison</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XIcon className="h-5 w-5" /></button>
        </div>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Nom</label>
        <input value={nom} onChange={e => setNom(e.target.value)} className={inputClass} placeholder="2026-2027" />

        <ul className="mt-4 flex flex-col gap-1.5 text-xs text-white/60">
          <li>— <strong className="text-white">{nom || "La nouvelle saison"}</strong> devient la saison en cours, vide : vous pouvez inscrire tout de suite.</li>
          <li>— Pour reprendre des enfants de {saisonCourante}, utilisez le bouton <strong className="text-white">Importer</strong> dans Inscriptions.</li>
          <li>— {saisonCourante} passe dans l&apos;historique, rien n&apos;est supprimé.</li>
          <li>— Le scan de l&apos;accueil ne reconnaît que les enfants inscrits dans la saison en cours.</li>
        </ul>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={valider}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Créer {nom}
        </button>
      </div>
    </div>
  );
}
