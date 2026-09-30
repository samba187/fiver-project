"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X as XIcon, AlertTriangle, Search, Square, CheckSquare, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { categorieParAge, generateBadgeCode } from "@/lib/academy";
import type { Registration, Tarifs } from "./page";

function ageAujourdhui(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

// L'enfant a pris un an : catégorie recalculée, l'ancienne est gardée s'il n'a pas de date de naissance
function nouvelleCategorie(r: Registration) {
  return categorieParAge(ageAujourdhui(r.date_naissance), r.sexe === "F") || r.categorie_foot || "";
}

function cleNom(r: Pick<Registration, "nom" | "prenom">) {
  return `${r.nom} ${r.prenom}`.trim().toLowerCase();
}

export function ImportInscritsModal({
  saison,
  saisonsSources,
  dejaInscrits,
  tarifs,
  onClose,
  onDone,
}: {
  saison: string;
  saisonsSources: string[];
  dejaInscrits: Registration[];
  tarifs: Tarifs;
  onClose: () => void;
  onDone: (nb: number) => void;
}) {
  const [source, setSource] = useState(saisonsSources[0] || "");
  const [liste, setListe] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [facturer, setFacturer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!source) return;
    setLoading(true);
    setSelected(new Set());
    supabase
      .from("academy_registrations")
      .select("*")
      .eq("saison", source)
      .order("nom")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setListe((data as Registration[]) || []);
        setLoading(false);
      });
  }, [source]);

  // Un enfant déjà présent dans la saison (même carte, ou même nom si pas de carte) n'est pas réimporté
  const dejaLa = useMemo(() => {
    const badges = new Set(dejaInscrits.map(r => r.badge_code).filter(Boolean));
    const noms = new Set(dejaInscrits.map(cleNom));
    return (r: Registration) => (r.badge_code ? badges.has(r.badge_code) : noms.has(cleNom(r)));
  }, [dejaInscrits]);

  const importables = liste.filter(r => !dejaLa(r));

  const affiches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return liste;
    return liste.filter(r => `${r.prenom} ${r.nom} ${r.nom_pere || ""} ${r.badge_code || ""}`.toLowerCase().includes(q));
  }, [liste, search]);

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function importer() {
    const cibles = importables.filter(r => selected.has(r.id));
    if (cibles.length === 0) return;
    setSaving(true);
    setError("");
    const rows = cibles.map(r => {
      const tarif_total = r.football && r.centre_loisirs ? tarifs.tarifCombo
        : r.football ? tarifs.tarifFoot
        : r.centre_loisirs ? tarifs.tarifLoisirs : 0;
      return {
        nom: r.nom,
        prenom: r.prenom,
        nom_pere: r.nom_pere,
        date_naissance: r.date_naissance,
        sexe: r.sexe,
        telephone_parent: r.telephone_parent,
        adresse: r.adresse,
        football: r.football,
        centre_loisirs: r.centre_loisirs,
        categorie_foot: nouvelleCategorie(r) || null,
        // Nouvelle saison = tarifs actuels : on n'hérite pas d'un ancien prix saisi sur la fiche
        tarif_football: 0,
        tarif_loisirs: 0,
        tarif_total,
        photo_url: r.photo_url,
        observations: r.observations,
        autorisation_sortie: r.autorisation_sortie,
        badge_code: r.badge_code || generateBadgeCode(),
        deja_inscrit: true,
        frais_inscription: tarifs.fraisInscriptionAncien,
        frais_inscription_paye: !facturer,
        montant_paye: 0,
        statut_paiement: "en_attente",
        inscription_fin_de_mois: false,
        saison,
      };
    });
    const { error: e } = await supabase.from("academy_registrations").insert(rows);
    setSaving(false);
    if (e) {
      console.error(e);
      setError(e.code === "23505"
        ? "Un des enfants sélectionnés est déjà dans cette saison. Rechargez la page et réessayez."
        : `Import impossible : ${e.message}`);
      return;
    }
    onDone(rows.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-lg border border-white/10 bg-[#111] p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Importer des anciens</h3>
            <p className="mt-1 text-xs text-white/40">Vers la saison <strong className="text-fiver-green">{saison}</strong></p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Depuis</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white focus:border-fiver-green focus:outline-none"
          >
            {saisonsSources.map(s => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
          </select>
          <div className="relative min-w-[10rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-sm border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-white/40">{importables.length} à importer sur {liste.length}</p>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set(importables.map(r => r.id)))} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout cocher</button>
            <button onClick={() => setSelected(new Set())} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Aucun</button>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto rounded-sm border border-white/5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>
          ) : affiches.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-white/30">Aucun enfant dans cette saison.</p>
          ) : affiches.map(r => {
            const importe = dejaLa(r);
            const checked = selected.has(r.id);
            const cat = nouvelleCategorie(r);
            return (
              <button
                key={r.id}
                disabled={importe}
                onClick={() => toggle(r.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors",
                  importe ? "opacity-40" : checked ? "bg-fiver-green/10" : "hover:bg-white/5"
                )}
              >
                {importe ? <CheckSquare className="h-4 w-4 shrink-0 text-white/30" />
                  : checked ? <CheckSquare className="h-4 w-4 shrink-0 text-fiver-green" />
                  : <Square className="h-4 w-4 shrink-0 text-white/20" />}
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">{r.prenom} {r.nom}</span>
                {importe ? (
                  <span className="text-[10px] font-bold uppercase text-white/40">Déjà importé</span>
                ) : cat && (
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/50">
                    {r.categorie_foot && r.categorie_foot !== cat ? <>{r.categorie_foot} → <span className="text-fiver-green">{cat}</span></> : cat}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-sm border border-white/10 bg-white/[0.02] p-3">
          <input type="checkbox" checked={facturer} onChange={e => setFacturer(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00c26e]" />
          <span>
            <span className="block text-sm font-medium text-white">Facturer l&apos;équipement ({tarifs.fraisInscriptionAncien} MRU)</span>
            <span className="mt-0.5 block text-[11px] text-white/40">Décochez si ces enfants ont déjà réglé leurs frais.</span>
          </span>
        </label>

        <p className="mt-3 text-[11px] text-white/40">
          Les enfants gardent leur carte QR, leur photo et leurs infos. Leurs mensualités repartent à zéro.
        </p>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={importer}
          disabled={saving || selected.size === 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Importer {selected.size} enfant{selected.size > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
