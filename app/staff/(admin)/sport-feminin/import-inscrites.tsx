"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X as XIcon, AlertTriangle, Square, CheckSquare, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface InscriteSource {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  telephone: string;
  enfant_inscrit: boolean;
  enfant_nom_prenom: string | null;
  notes: string | null;
}

const cle = (i: { nom: string; prenom: string; telephone?: string | null }) =>
  (i.telephone || `${i.nom} ${i.prenom}`).replace(/\s+/g, "").toLowerCase();

export function ImportInscritesModal({
  saison,
  dejaInscrites,
  onClose,
  onDone,
}: {
  saison: string;
  dejaInscrites: { nom: string; prenom: string; telephone: string }[];
  onClose: () => void;
  onDone: (nb: number) => void;
}) {
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [liste, setListe] = useState<InscriteSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("saisons").select("nom").order("nom", { ascending: false }).then(({ data }) => {
      const noms = (data || []).map(s => s.nom as string).filter(n => n !== saison);
      setSources(noms);
      setSource(noms[0] || "");
      if (noms.length === 0) setLoading(false);
    });
  }, [saison]);

  useEffect(() => {
    if (!source) return;
    setLoading(true);
    setSelected(new Set());
    supabase.from("sport_feminin_inscriptions").select("*").eq("saison", source).order("nom").then(({ data, error }) => {
      if (error) setError(error.message);
      setListe((data as InscriteSource[]) || []);
      setLoading(false);
    });
  }, [source]);

  const presentes = useMemo(() => new Set(dejaInscrites.map(cle)), [dejaInscrites]);
  const importables = liste.filter(i => !presentes.has(cle(i)));

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function importer() {
    const cibles = importables.filter(i => selected.has(i.id));
    if (cibles.length === 0) return;
    setSaving(true);
    setError("");
    const { error: e } = await supabase.from("sport_feminin_inscriptions").insert(cibles.map(i => ({
      nom: i.nom,
      prenom: i.prenom,
      date_naissance: i.date_naissance,
      telephone: i.telephone,
      enfant_inscrit: i.enfant_inscrit,
      enfant_nom_prenom: i.enfant_nom_prenom,
      notes: i.notes,
      statut: "confirmé",
      saison,
    })));
    setSaving(false);
    if (e) { console.error(e); setError(`Import impossible : ${e.message}`); return; }
    onDone(cibles.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-lg border border-white/10 bg-[#111] p-5 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Importer des anciennes</h3>
            <p className="mt-1 text-xs text-white/40">Vers la saison <strong className="text-white">{saison}</strong></p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XIcon className="h-5 w-5" /></button>
        </div>

        {sources.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white focus:outline-none"
            >
              {sources.map(s => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(importables.map(i => i.id)))} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout cocher</button>
              <button onClick={() => setSelected(new Set())} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Aucune</button>
            </div>
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto rounded-sm border border-white/5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#c81054]" /></div>
          ) : liste.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-white/30">Aucune inscrite à importer.</p>
          ) : liste.map(i => {
            const deja = presentes.has(cle(i));
            const checked = selected.has(i.id);
            return (
              <button
                key={i.id}
                disabled={deja}
                onClick={() => toggle(i.id)}
                className={cn("flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors",
                  deja ? "opacity-40" : checked ? "bg-[#c81054]/10" : "hover:bg-white/5")}
              >
                {deja || checked ? <CheckSquare className={cn("h-4 w-4 shrink-0", deja ? "text-white/30" : "text-[#c81054]")} /> : <Square className="h-4 w-4 shrink-0 text-white/20" />}
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">{i.prenom} {i.nom}</span>
                {deja && <span className="text-[10px] font-bold uppercase text-white/40">Déjà importée</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={importer}
          disabled={saving || selected.size === 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#c81054] py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Importer {selected.size} inscrite{selected.size > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
