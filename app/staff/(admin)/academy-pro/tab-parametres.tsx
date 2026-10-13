"use client";

import { useEffect, useState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ACADEMY_CATEGORIES, JOURS_COURTS, fetchPlanning, type PlanningAcademy } from "@/lib/academy";
import type { Tarifs } from "./page";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";
// Lundi en premier
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

async function enregistrerReglage(key: string, value: string) {
  const { data } = await supabase.from("settings").select("key").eq("key", key).limit(1);
  const { error } = data && data.length > 0
    ? await supabase.from("settings").update({ value }).eq("key", key)
    : await supabase.from("settings").insert({ key, value });
  if (error) throw error;
}

export function TabParametres({ tarifs, setTarifs }: { tarifs: Tarifs; setTarifs: (t: Tarifs) => void }) {
  const [planning, setPlanning] = useState<PlanningAcademy | null>(null);
  const [etat, setEtat] = useState<"" | "saving" | "saved" | "error">("");

  useEffect(() => { fetchPlanning().then(setPlanning); }, []);

  const prixCat = tarifs.tarifsCategorie || {};
  function setPrixCat(cat: string, val: string) {
    const next = { ...prixCat };
    const n = parseInt(val);
    if (!val || Number.isNaN(n)) delete next[cat]; else next[cat] = n;
    setTarifs({ ...tarifs, tarifsCategorie: next });
  }

  function majCreneau(cat: string, patch: Partial<PlanningAcademy[string]>) {
    if (!planning) return;
    setPlanning({ ...planning, [cat]: { ...planning[cat], ...patch } });
  }

  async function save() {
    setEtat("saving");
    try {
      await enregistrerReglage("academy_tarifs", JSON.stringify(tarifs));
      if (planning) await enregistrerReglage("academy_planning", JSON.stringify(planning));
      setEtat("saved");
      setTimeout(() => setEtat(""), 2000);
    } catch (e) {
      console.error(e);
      setEtat("error");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Tarification */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💰 Mensualités</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Football (MRU)</label>
            <input type="number" value={tarifs.tarifFoot} onChange={e => setTarifs({ ...tarifs, tarifFoot: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Loisirs (MRU)</label>
            <input type="number" value={tarifs.tarifLoisirs} onChange={e => setTarifs({ ...tarifs, tarifLoisirs: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Combo Foot + Loisirs (MRU)</label>
            <input type="number" value={tarifs.tarifCombo} onChange={e => setTarifs({ ...tarifs, tarifCombo: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Prix par catégorie */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-1 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">⚽ Football — prix par catégorie</h2>
        <p className="mb-4 text-xs text-white/40">Case vide = prix football normal ({tarifs.tarifFoot.toLocaleString("fr-FR")} MRU).</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACADEMY_CATEGORIES.map(cat => (
            <div key={cat}>
              <label className="mb-1 block text-xs font-bold text-fiver-green">{cat}</label>
              <input
                type="number"
                value={prixCat[cat] ?? ""}
                placeholder={String(tarifs.tarifFoot)}
                onChange={e => setPrixCat(cat, e.target.value)}
                className={cn(inputClass, prixCat[cat] !== undefined && "border-fiver-green/40")}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Frais d'inscription */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">🎟️ Frais d&apos;inscription</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Nouveaux inscrits (MRU)</label>
            <input type="number" value={tarifs.fraisInscription} onChange={e => setTarifs({ ...tarifs, fraisInscription: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Anciens inscrits (MRU)</label>
            <input type="number" value={tarifs.fraisInscriptionAncien} onChange={e => setTarifs({ ...tarifs, fraisInscriptionAncien: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Règles de paiement */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Paiement mensuel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Jour limite de paiement</label>
            <input type="number" min={1} max={28} value={tarifs.jourLimitePaiement} onChange={e => setTarifs({ ...tarifs, jourLimitePaiement: Math.min(28, Math.max(1, parseInt(e.target.value) || 10)) })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Inscription « fin de mois » à partir du</label>
            <input type="number" min={15} max={31} value={tarifs.seuilFinDeMois} onChange={e => setTarifs({ ...tarifs, seuilFinDeMois: Math.min(31, Math.max(15, parseInt(e.target.value) || 25)) })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Planning des entraînements */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">🗓️ Planning des entraînements</h2>
        {!planning ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-fiver-green" /></div>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {ACADEMY_CATEGORIES.map(cat => {
              const c = planning[cat] || { jours: [], heure: "", terrain: "" };
              return (
                <div key={cat} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <span className="w-16 shrink-0 text-xs font-bold text-fiver-green">{cat}</span>
                  <div className="flex flex-wrap gap-1">
                    {ORDRE_JOURS.map(j => {
                      const actif = c.jours.includes(j);
                      return (
                        <button
                          key={j}
                          type="button"
                          onClick={() => majCreneau(cat, { jours: actif ? c.jours.filter(x => x !== j) : [...c.jours, j].sort() })}
                          className={cn("h-8 w-10 rounded-sm text-[11px] font-bold transition-colors", actif ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40 hover:bg-white/10")}
                        >
                          {JOURS_COURTS[j]}
                        </button>
                      );
                    })}
                  </div>
                  <input value={c.heure} onChange={e => majCreneau(cat, { heure: e.target.value })} placeholder="15h45 - 17h00" className={cn(inputClass, "sm:w-36")} />
                  <input value={c.terrain} onChange={e => majCreneau(cat, { terrain: e.target.value })} placeholder="Terrain" className={cn(inputClass, "sm:w-32")} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {etat === "error" && <p className="text-sm text-red-400">L&apos;enregistrement a échoué. Réessayez.</p>}
      <button onClick={save} disabled={etat === "saving"} className="flex items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-50">
        {etat === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : etat === "saved" ? <><Check className="h-4 w-4" /> Sauvegardé !</> : <><Save className="h-4 w-4" /> Enregistrer les paramètres</>}
      </button>
    </div>
  );
}
