"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Check, X as XIcon, ScanLine, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  ACADEMY_CATEGORIES, fetchPlanning, fetchSaisonCourante, seancesEntre, dateLocale, decalerJours, type PlanningAcademy,
} from "@/lib/academy";

interface Joueur { id: number; nom: string; prenom: string; categorie_foot: string | null; photo_url: string | null; autorisation_sortie: boolean | null }
interface LignePresence { registration_id: number; reponse_parent: "present" | "absent" | null; presence_reelle: "present" | "absent" | null }

function dateLongue(d: string) {
  const l = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export function SeancesView() {
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [planning, setPlanning] = useState<PlanningAcademy | null>(null);
  const [categorie, setCategorie] = useState("");
  const [date, setDate] = useState(dateLocale());
  const [lignes, setLignes] = useState<LignePresence[]>([]);
  const [scans, setScans] = useState<Set<number>>(new Set());
  const [chargement, setChargement] = useState(true);
  const [majEnCours, setMajEnCours] = useState<number | null>(null);
  const [auteur, setAuteur] = useState<string | null>(null);
  const aujourdhui = dateLocale();

  useEffect(() => {
    (async () => {
      const [saison, plan] = await Promise.all([fetchSaisonCourante(), fetchPlanning()]);
      const { data } = await supabase
        .from("academy_registrations")
        .select("id, nom, prenom, categorie_foot, photo_url, autorisation_sortie")
        .eq("saison", saison)
        .order("prenom");
      const liste = (data as Joueur[]) || [];
      setJoueurs(liste);
      setPlanning(plan);
      const cats = ACADEMY_CATEGORIES.filter(c => liste.some(j => j.categorie_foot === c));
      setCategorie(cats[0] || "");
      const { data: u } = await supabase.auth.getUser();
      setAuteur(u.user?.email?.split("@")[0] || null);
      setChargement(false);
    })();
  }, []);

  const categories = useMemo(() => ACADEMY_CATEGORIES.filter(c => joueurs.some(j => j.categorie_foot === c)), [joueurs]);
  const dates = useMemo(
    () => (planning && categorie ? seancesEntre(planning, categorie, decalerJours(aujourdhui, -14), decalerJours(aujourdhui, 14)) : []),
    [planning, categorie, aujourdhui]
  );

  // À chaque changement de catégorie : séance du jour, sinon la prochaine, sinon la dernière
  useEffect(() => {
    if (dates.length === 0) return;
    setDate(dates.find(d => d >= aujourdhui) || dates[dates.length - 1]);
  }, [dates, aujourdhui]);

  const joueursCat = useMemo(() => joueurs.filter(j => j.categorie_foot === categorie), [joueurs, categorie]);

  const chargerSeance = useCallback(async () => {
    if (joueursCat.length === 0) { setLignes([]); setScans(new Set()); return; }
    const ids = joueursCat.map(j => j.id);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("academy_seance_presences").select("registration_id, reponse_parent, presence_reelle").eq("date_seance", date).in("registration_id", ids),
      supabase.from("academy_presences").select("registration_id").eq("date_presence", date).eq("autorise", true).in("registration_id", ids),
    ]);
    setLignes((p as LignePresence[]) || []);
    setScans(new Set(((s as { registration_id: number }[]) || []).map(x => x.registration_id)));
  }, [joueursCat, date]);

  useEffect(() => { chargerSeance(); }, [chargerSeance]);

  async function pointer(id: number, valeur: "present" | "absent") {
    const actuelle = lignes.find(l => l.registration_id === id)?.presence_reelle || null;
    const nouvelle = actuelle === valeur ? null : valeur;
    setMajEnCours(id);
    const { error } = await supabase.from("academy_seance_presences").upsert(
      { registration_id: id, date_seance: date, presence_reelle: nouvelle, maj_coach_le: new Date().toISOString(), maj_coach_par: auteur },
      { onConflict: "registration_id,date_seance" }
    );
    if (error) alert("Pointage non enregistré : " + error.message);
    await chargerSeance();
    setMajEnCours(null);
  }

  if (chargement) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>;

  const parId = new Map(lignes.map(l => [l.registration_id, l]));
  const groupes = [
    { cle: "present", titre: "Présents", sousTitre: "confirmés par les parents", cls: "text-fiver-green", liste: joueursCat.filter(j => parId.get(j.id)?.reponse_parent === "present") },
    { cle: "absent", titre: "Absents", sousTitre: "signalés par les parents", cls: "text-red-300", liste: joueursCat.filter(j => parId.get(j.id)?.reponse_parent === "absent") },
    { cle: "sans", titre: "Sans réponse", sousTitre: "", cls: "text-white/60", liste: joueursCat.filter(j => !parId.get(j.id)?.reponse_parent) },
  ];
  const pointables = date <= aujourdhui;
  const nbPresentsReels = joueursCat.filter(j => parId.get(j.id)?.presence_reelle === "present" || (scans.has(j.id) && parId.get(j.id)?.presence_reelle !== "absent")).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white">Séances</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {categories.map(c => (
          <button key={c} onClick={() => setCategorie(c)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", categorie === c ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/60")}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={date} onChange={e => setDate(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm font-semibold text-white">
          {!dates.includes(date) && <option value={date}>{dateLongue(date)}</option>}
          {dates.map(d => <option key={d} value={d}>{dateLongue(d)}{d === aujourdhui ? " (aujourd'hui)" : ""}</option>)}
        </select>
        <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white" aria-label="Autre date" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {groupes.map(g => (
          <div key={g.cle} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
            <p className={cn("text-2xl font-bold", g.cls)}>{g.liste.length}</p>
            <p className="text-[11px] text-white/40">{g.titre}</p>
          </div>
        ))}
      </div>
      {pointables && (
        <p className="text-xs text-white/40">
          Pointage réel : <strong className="text-fiver-green">{nbPresentsReels}</strong> présent(s) sur {joueursCat.length}. Les enfants scannés à l&apos;accueil sont comptés présents.
        </p>
      )}

      {groupes.map(g => (
        <section key={g.cle}>
          <h2 className={cn("mb-2 text-sm font-bold uppercase tracking-wide", g.cls)}>
            {g.titre} ({g.liste.length}){g.sousTitre && <span className="ml-1 text-[11px] font-normal normal-case text-white/30">— {g.sousTitre}</span>}
          </h2>
          {g.liste.length === 0 ? (
            <p className="mb-2 text-xs text-white/30">Personne.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {g.liste.map(j => {
                const reel = parId.get(j.id)?.presence_reelle || null;
                const scanne = scans.has(j.id);
                return (
                  <div key={j.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/5">
                      {j.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={j.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/30">{j.prenom[0]}{j.nom[0]}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{j.prenom} {j.nom}</p>
                      <div className="flex gap-1.5">
                        {scanne && <span className="flex items-center gap-0.5 text-[10px] font-bold text-fiver-green"><ScanLine className="h-3 w-3" /> Scanné</span>}
                        {j.autorisation_sortie === false && <span className="text-[10px] font-bold text-red-300">Ne rentre pas seul</span>}
                        {g.cle === "sans" && !scanne && <span className="flex items-center gap-0.5 text-[10px] text-white/30"><HelpCircle className="h-3 w-3" /> pas de réponse</span>}
                      </div>
                    </div>
                    {pointables && (
                      majEnCours === j.id ? <Loader2 className="h-4 w-4 animate-spin text-fiver-green" /> : (
                        <div className="flex gap-1">
                          <button onClick={() => pointer(j.id, "present")} aria-label="Présent" className={cn("flex h-9 w-9 items-center justify-center rounded-lg", reel === "present" || (scanne && !reel) ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40")}>
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => pointer(j.id, "absent")} aria-label="Absent" className={cn("flex h-9 w-9 items-center justify-center rounded-lg", reel === "absent" ? "bg-red-500 text-white" : "bg-white/5 text-white/40")}>
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
