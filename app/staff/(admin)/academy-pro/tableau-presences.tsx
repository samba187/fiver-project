"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Check, X as XIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  categoriesPresentes, currentMonthStr, estArrete, fetchPlanning, seancesEntre, dateLocale, type PlanningAcademy,
} from "@/lib/academy";
import type { Registration } from "./page";

// Vue d'ensemble des présences d'un mois : pour chaque enfant et chaque séance du planning,
// le statut retenu est le pointage du coach, sinon le scan de la carte, sinon la réponse du parent.

type Statut = "present" | "absent" | null;
interface Ligne { registration_id: number; date_seance: string; reponse_parent: Statut; presence_reelle: Statut }

function decalerMois(mois: string, n: number) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return currentMonthStr(d);
}

function libelleMois(mois: string) {
  const l = new Date(mois + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function finDuMois(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  return dateLocale(new Date(a, m, 0));
}

export function TableauPresences({ registrations }: { registrations: Registration[] }) {
  const [planning, setPlanning] = useState<PlanningAcademy | null>(null);
  const [mois, setMois] = useState(currentMonthStr());
  const [categorie, setCategorie] = useState<string>("toutes");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [scans, setScans] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(true);
  const [majEnCours, setMajEnCours] = useState<string | null>(null);
  const [auteur, setAuteur] = useState<string | null>(null);
  const aujourdhui = dateLocale();
  const debut = `${mois}-01`;
  const fin = finDuMois(mois);

  useEffect(() => {
    fetchPlanning().then(setPlanning);
    supabase.auth.getUser().then(({ data }) => setAuteur(data.user?.email?.split("@")[0] || null));
  }, []);

  // Enfants encore inscrits ce mois-là (ceux qui ont arrêté avant n'apparaissent plus)
  const enfants = useMemo(
    () => registrations.filter(r => r.football && r.categorie_foot && !estArrete(r, mois)),
    [registrations, mois]
  );
  const categories = useMemo(() => categoriesPresentes(enfants.map(r => r.categorie_foot)), [enfants]);

  // Seule la dernière demande compte (changement de mois rapide)
  const derniereDemande = useRef(0);
  const charger = useCallback(async () => {
    const demande = ++derniereDemande.current;
    const ids = enfants.map(r => r.id);
    if (ids.length === 0) { setLignes([]); setScans(new Set()); setChargement(false); return; }
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("academy_seance_presences").select("registration_id, date_seance, reponse_parent, presence_reelle")
        .in("registration_id", ids).gte("date_seance", debut).lte("date_seance", fin),
      supabase.from("academy_presences").select("registration_id, date_presence")
        .in("registration_id", ids).eq("autorise", true).gte("date_presence", debut).lte("date_presence", fin),
    ]);
    if (demande !== derniereDemande.current) return;
    setLignes((p as Ligne[]) || []);
    setScans(new Set(((s as { registration_id: number; date_presence: string }[]) || []).map(x => `${x.registration_id}|${x.date_presence}`)));
    setChargement(false);
  }, [enfants, debut, fin]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const parCle = useMemo(() => new Map(lignes.map(l => [`${l.registration_id}|${l.date_seance}`, l])), [lignes]);
  const statut = (id: number, date: string): Statut => {
    const l = parCle.get(`${id}|${date}`);
    return l?.presence_reelle || (scans.has(`${id}|${date}`) ? "present" : l?.reponse_parent || null);
  };

  // Bilan d'un enfant sur ses séances passées du mois
  const bilan = (r: Registration) => {
    const dates = planning ? seancesEntre(planning, r.categorie_foot, debut, fin).filter(d => d <= aujourdhui) : [];
    let present = 0, absent = 0;
    for (const d of dates) { const s = statut(r.id, d); if (s === "present") present++; else if (s === "absent") absent++; }
    return { seances: dates.length, present, absent, inconnu: dates.length - present - absent };
  };

  async function pointer(id: number, date: string) {
    const cle = `${id}|${date}`;
    const actuel = parCle.get(cle)?.presence_reelle || null;
    // Clic : présent → absent → (annulé) → présent…
    const suivant: Statut = actuel === null ? "present" : actuel === "present" ? "absent" : null;
    setMajEnCours(cle);
    const { error } = await supabase.from("academy_seance_presences").upsert(
      { registration_id: id, date_seance: date, presence_reelle: suivant, maj_coach_le: new Date().toISOString(), maj_coach_par: auteur },
      { onConflict: "registration_id,date_seance" }
    );
    if (error) alert("Pointage non enregistré : " + error.message);
    await charger();
    setMajEnCours(null);
  }

  const enfantsCat = categorie === "toutes" ? [] : enfants.filter(r => r.categorie_foot === categorie);
  const dates = planning && categorie !== "toutes" ? seancesEntre(planning, categorie, debut, fin) : [];

  const recap = useMemo(() => {
    if (categorie !== "toutes" || !planning) return [];
    return enfants
      .map(r => ({ r, ...bilan(r) }))
      .sort((a, b) => b.absent - a.absent || b.inconnu - a.inconnu || a.r.prenom.localeCompare(b.r.prenom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorie, planning, enfants, lignes, scans, mois]);

  const totalPresents = recap.reduce((s, x) => s + x.present, 0);
  const totalAbsents = recap.reduce((s, x) => s + x.absent, 0);
  const totalInconnus = recap.reduce((s, x) => s + x.inconnu, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03]">
          <button onClick={() => setMois(m => decalerMois(m, -1))} className="p-2 text-white/50 hover:text-white" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-white">{libelleMois(mois)}</span>
          <button onClick={() => setMois(m => decalerMois(m, 1))} className="p-2 text-white/50 hover:text-white" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {["toutes", ...categories].map(c => (
            <button key={c} onClick={() => setCategorie(c)}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold", categorie === c ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/60")}>
              {c === "toutes" ? "Toutes" : c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-white/40">
        <span className="flex items-center gap-1"><span className="flex h-4 w-4 items-center justify-center rounded bg-fiver-green text-fiver-black"><Check className="h-3 w-3" /></span> Présent</span>
        <span className="flex items-center gap-1"><span className="flex h-4 w-4 items-center justify-center rounded bg-red-500 text-white"><XIcon className="h-3 w-3" /></span> Absent</span>
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded border border-white/15" /> Pas encore pointé</span>
        <span>Couleur pâle = réponse du parent, pas encore confirmée</span>
      </div>

      {chargement || !planning ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>
      ) : categorie === "toutes" ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><p className="text-2xl font-bold text-fiver-green">{totalPresents}</p><p className="text-[11px] text-white/40">Présences</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><p className="text-2xl font-bold text-red-300">{totalAbsents}</p><p className="text-[11px] text-white/40">Absences</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><p className="text-2xl font-bold text-white/60">{totalInconnus}</p><p className="text-[11px] text-white/40">Non pointées</p></div>
          </div>
          {recap.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/30">Aucun enfant inscrit au football ce mois-ci.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wide text-white/40">
                    <th className="px-3 py-2.5">Enfant</th><th className="px-3 py-2.5">Cat.</th>
                    <th className="px-3 py-2.5 text-center">Séances</th><th className="px-3 py-2.5 text-center">Présent</th>
                    <th className="px-3 py-2.5 text-center">Absent</th><th className="px-3 py-2.5 text-center">Non pointé</th><th className="px-3 py-2.5 text-center">Assiduité</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map(({ r, seances, present, absent, inconnu }) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="px-3 py-2 font-medium text-white">{r.prenom} {r.nom}</td>
                      <td className="px-3 py-2 text-xs text-white/50">{r.categorie_foot}</td>
                      <td className="px-3 py-2 text-center text-white/60">{seances}</td>
                      <td className="px-3 py-2 text-center font-bold text-fiver-green">{present}</td>
                      <td className={cn("px-3 py-2 text-center font-bold", absent ? "text-red-300" : "text-white/20")}>{absent}</td>
                      <td className="px-3 py-2 text-center text-white/40">{inconnu}</td>
                      <td className="px-3 py-2 text-center text-xs text-white/60">{present + absent ? `${Math.round((present / (present + absent)) * 100)} %` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : dates.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/30">Pas de séance {categorie} prévue ce mois-ci (voir le planning dans Paramètres).</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase text-white/40">
                <th className="sticky left-0 z-10 bg-[#141414] px-3 py-2.5 text-left">Enfant</th>
                {dates.map(d => {
                  const j = new Date(d + "T00:00:00");
                  return (
                    <th key={d} className={cn("px-1.5 py-2.5 text-center", d === aujourdhui && "text-fiver-green")}>
                      <span className="block">{j.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
                      <span className="block text-white/70">{j.getDate()}</span>
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 text-center">Prés.</th>
                <th className="px-3 py-2.5 text-center">Abs.</th>
              </tr>
            </thead>
            <tbody>
              {enfantsCat.map(r => {
                const b = bilan(r);
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-[#141414] px-3 py-1.5 font-medium text-white">{r.prenom} {r.nom}</td>
                    {dates.map(d => {
                      const cle = `${r.id}|${d}`;
                      const l = parCle.get(cle);
                      const s = statut(r.id, d);
                      const confirme = !!l?.presence_reelle || scans.has(cle);
                      return (
                        <td key={d} className="px-1 py-1 text-center">
                          <button
                            onClick={() => pointer(r.id, d)}
                            disabled={majEnCours === cle}
                            title={l?.reponse_parent ? `Parent : ${l.reponse_parent === "present" ? "présent" : "absent"}` : scans.has(cle) ? "Carte scannée" : "Cliquer pour pointer"}
                            className={cn("mx-auto flex h-8 w-8 items-center justify-center rounded-md border",
                              s === "present" ? (confirme ? "border-fiver-green bg-fiver-green text-fiver-black" : "border-fiver-green/40 bg-fiver-green/15 text-fiver-green")
                                : s === "absent" ? (confirme ? "border-red-500 bg-red-500 text-white" : "border-red-500/40 bg-red-500/15 text-red-300")
                                : "border-white/10 text-white/20 hover:border-white/30")}
                          >
                            {majEnCours === cle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s === "present" ? <Check className="h-4 w-4" /> : s === "absent" ? <XIcon className="h-4 w-4" /> : "·"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center font-bold text-fiver-green">{b.present}</td>
                    <td className={cn("px-3 py-1.5 text-center font-bold", b.absent ? "text-red-300" : "text-white/20")}>{b.absent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
