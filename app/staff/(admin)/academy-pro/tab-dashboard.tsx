"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ACADEMY_CATEGORIES, debutSaison, currentMonthStr } from "@/lib/academy";
import type { Registration, Tarifs } from "./page";

type Paiement = { mois_concerne: string; montant: number; moyen_paiement?: string | null; date_paiement?: string };

function formatMonth(val: string) {
  const d = new Date(val + "-01T00:00:00");
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function historique(r: Registration): Paiement[] {
  return (r.academy_payments_history || []) as Paiement[];
}

/** La mensualité de ce mois est-elle due par cette fiche ? */
function estDu(r: Registration, month: string) {
  if (historique(r).some(h => h.mois_concerne === month && h.moyen_paiement === "OFF")) return false;
  const debut = debutSaison(r.saison);
  if (debut && month < debut) return false;
  if (!r.created_at) return true;
  const cm = currentMonthStr(new Date(r.created_at));
  if (month < cm) return false;
  if (r.inscription_fin_de_mois && cm === month) return false;
  return true;
}

function mensualite(r: Registration, tarifFoot: number) {
  const base = r.tarif_football > 0 ? r.tarif_football : r.tarif_total > 0 ? r.tarif_total : tarifFoot;
  return base + (r.tarif_loisirs || 0);
}

function recuPourMois(r: Registration, month: string) {
  return historique(r)
    .filter(h => h.mois_concerne === month && h.moyen_paiement !== "OFF")
    .reduce((s, h) => s + h.montant, 0);
}

const mru = (n: number) => `${n.toLocaleString("fr-FR")} MRU`;
const couleurTaux = (t: number) => (t >= 70 ? "text-green-400" : t >= 40 ? "text-amber-400" : "text-red-400");

export function TabDashboard({
  registrations,
  tarifs,
  saison,
  moisSaison,
  estSaisonCourante,
}: {
  registrations: Registration[];
  tarifs: Tarifs;
  saison: string;
  moisSaison: string[];
  estSaisonCourante: boolean;
}) {
  const [periode, setPeriode] = useState<"saison" | string>("saison");
  const moisActuel = currentMonthStr();
  const jourDuMois = new Date().getDate();

  const stats = useMemo(() => {
    // ---------- Inscrits (indépendant de la période) ----------
    const total = registrations.length;
    const anciens = registrations.filter(r => r.deja_inscrit).length;
    const football = registrations.filter(r => r.football).length;
    const loisirs = registrations.filter(r => r.centre_loisirs).length;
    const garcons = registrations.filter(r => r.sexe === "M").length;
    const filles = registrations.filter(r => r.sexe === "F").length;
    const autresCats = Array.from(new Set(registrations.map(r => r.categorie_foot || "").filter(c => c && !ACADEMY_CATEGORIES.includes(c))));
    const byCat = [...ACADEMY_CATEGORIES, ...autresCats, ""].map(cat => {
      const p = registrations.filter(r => (r.categorie_foot || "") === cat);
      return { name: cat || "Sans catégorie", nb: p.length, g: p.filter(r => r.sexe === "M").length, f: p.filter(r => r.sexe === "F").length };
    }).filter(c => c.nb > 0);

    // ---------- Mensualités, mois par mois ----------
    const lignes = moisSaison.map(month => {
      const echu = month <= moisActuel;
      let du = 0, recu = 0, reste = 0, aJour = 0, partiel = 0, impaye = 0;
      registrations.forEach(r => {
        const paye = recuPourMois(r, month);
        recu += paye;
        if (!estDu(r, month)) return;
        const m = mensualite(r, tarifs.tarifFoot);
        du += m;
        reste += Math.max(0, m - paye);
        if (paye >= m) aJour++;
        else if (paye > 0) partiel++;
        else impaye++;
      });
      // Retard = pas à jour sur un mois passé, ou sur le mois en cours une fois le jour limite dépassé
      const enRetard = month < moisActuel || (month === moisActuel && jourDuMois > tarifs.jourLimitePaiement);
      return { month, echu, du, recu, reste, aJour, partiel, impaye, enRetard };
    });

    const selection = periode === "saison" ? lignes : lignes.filter(l => l.month === periode);
    const echues = selection.filter(l => l.echu);
    const du = echues.reduce((s, l) => s + l.du, 0);
    const recu = echues.reduce((s, l) => s + l.recu, 0);
    const reste = echues.reduce((s, l) => s + l.reste, 0);
    const avance = selection.filter(l => !l.echu).reduce((s, l) => s + l.recu, 0);

    // ---------- Frais d'inscription (toujours sur la saison entière) ----------
    const fraisPrevu = registrations.reduce((s, r) => s + (r.frais_inscription || 0), 0);
    const nbFraisPayes = registrations.filter(r => r.frais_inscription_paye).length;
    const fraisReste = registrations.filter(r => !r.frais_inscription_paye).reduce((s, r) => s + (r.frais_inscription || 0), 0);
    const fraisEncaisse = registrations.reduce((s, r) => {
      const lignesFrais = historique(r).filter(h => h.mois_concerne === "FRAIS");
      if (lignesFrais.length > 0) return s + lignesFrais.reduce((a, h) => a + h.montant, 0);
      // Anciennes fiches payées avant l'historique des paiements
      return s + (r.frais_inscription_paye && !r.deja_inscrit ? (r.frais_inscription || 0) : 0);
    }, 0);

    // ---------- Encaissements par moyen de paiement (période choisie) ----------
    const moisChoisis = new Set(selection.map(l => l.month));
    const parMoyen: Record<string, number> = {};
    registrations.forEach(r => historique(r).forEach(h => {
      if (h.moyen_paiement === "OFF") return;
      const compte = moisChoisis.has(h.mois_concerne) || (periode === "saison" && h.mois_concerne === "FRAIS");
      if (compte) parMoyen[h.moyen_paiement || "Autre"] = (parMoyen[h.moyen_paiement || "Autre"] || 0) + h.montant;
    }));

    const moisEnCours = estSaisonCourante ? lignes.find(l => l.month === moisActuel) : undefined;

    return {
      total, anciens, nouveaux: total - anciens, football, loisirs, garcons, filles, byCat,
      lignes, du, recu, reste, avance, taux: du > 0 ? (recu / du) * 100 : 0,
      fraisPrevu, fraisEncaisse, fraisReste, nbFraisPayes,
      parMoyen: Object.entries(parMoyen).sort((a, b) => b[1] - a[1]),
      moisEnCours,
    };
  }, [registrations, tarifs, moisSaison, periode, moisActuel, jourDuMois, estSaisonCourante]);

  const libellePeriode = periode === "saison" ? `saison ${saison}` : formatMonth(periode);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête : ce que montre cet écran */}
      <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Saison {saison}</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Uniquement les enfants inscrits dans cette saison. Changez de saison avec le sélecteur en haut de page.
          </p>
        </div>
        <select
          value={periode}
          onChange={e => setPeriode(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white focus:border-fiver-green focus:outline-none"
        >
          <option value="saison" className="bg-[#1a1a1a]">Toute la saison</option>
          {moisSaison.map(m => <option key={m} value={m} className="bg-[#1a1a1a]">{formatMonth(m)}</option>)}
        </select>
      </div>

      {/* 1. Inscrits */}
      <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">👥 Inscrits de la saison</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Total", val: stats.total, cls: "text-white" },
            { label: "Nouveaux", val: stats.nouveaux, cls: "text-fiver-green" },
            { label: "Anciens (réinscrits)", val: stats.anciens, cls: "text-amber-400" },
            { label: "Football", val: stats.football, cls: "text-white/80" },
            { label: "Loisirs", val: stats.loisirs, cls: "text-white/80" },
            { label: "Garçons", val: stats.garcons, cls: "text-blue-300" },
            { label: "Filles", val: stats.filles, cls: "text-pink-400" },
          ].map(k => (
            <div key={k.label} className="rounded-md bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/30">{k.label}</p>
              <p className={cn("mt-1 font-[var(--font-heading)] text-2xl font-bold", k.cls)}>{k.val}</p>
            </div>
          ))}
        </div>
        {stats.byCat.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30">
                  <th className="px-3 py-2">Catégorie</th><th className="px-3 py-2 text-center">Inscrits</th><th className="px-3 py-2 text-center">Garçons</th><th className="px-3 py-2 text-center">Filles</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCat.map(c => (
                  <tr key={c.name} className="border-b border-white/5">
                    <td className="px-3 py-2 text-xs font-bold text-fiver-green">{c.name}</td>
                    <td className="px-3 py-2 text-center text-sm text-white/80">{c.nb}</td>
                    <td className="px-3 py-2 text-center text-sm text-blue-300">{c.g}</td>
                    <td className="px-3 py-2 text-center text-sm text-pink-400">{c.f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Mensualités */}
      <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💰 Mensualités — {libellePeriode}</h3>
        <p className="mb-4 mt-1 text-[11px] text-white/35">
          « Dû » = ce que les inscrits devaient payer pour les mois déjà commencés. Les mois à venir ne sont pas comptés.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-md bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wide text-white/30">Dû à ce jour</p><p className="mt-1 text-xl font-bold text-white">{mru(stats.du)}</p></div>
          <div className="rounded-md bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wide text-white/30">Reçu</p><p className="mt-1 text-xl font-bold text-fiver-green">{mru(stats.recu)}</p></div>
          <div className="rounded-md bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wide text-white/30">Reste à encaisser</p><p className="mt-1 text-xl font-bold text-red-400">{mru(stats.reste)}</p></div>
          <div className="rounded-md bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wide text-white/30">Recouvrement</p><p className={cn("mt-1 text-xl font-bold", couleurTaux(stats.taux))}>{stats.du > 0 ? `${stats.taux.toFixed(0)} %` : "—"}</p></div>
        </div>
        {stats.avance > 0 && (
          <p className="mt-3 text-xs text-white/50">+ <strong className="text-fiver-green">{mru(stats.avance)}</strong> déjà payés d&apos;avance pour des mois à venir.</p>
        )}

        {stats.moisEnCours && (periode === "saison" || periode === moisActuel) && (
          <div className="mt-5 rounded-md border border-white/5 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
              Mois en cours — {formatMonth(moisActuel)} ({jourDuMois <= tarifs.jourLimitePaiement ? `paiement attendu jusqu'au ${tarifs.jourLimitePaiement}` : `délai du ${tarifs.jourLimitePaiement} dépassé`})
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-sm bg-green-500/10 p-3"><span className="block text-lg font-bold text-green-400">{stats.moisEnCours.aJour}</span><span className="text-white/40">À jour</span></div>
              <div className="rounded-sm bg-amber-500/10 p-3"><span className="block text-lg font-bold text-amber-400">{stats.moisEnCours.partiel}</span><span className="text-white/40">Partiel</span></div>
              <div className={cn("rounded-sm p-3", stats.moisEnCours.enRetard ? "bg-red-500/10" : "bg-white/5")}>
                <span className={cn("block text-lg font-bold", stats.moisEnCours.enRetard ? "text-red-400" : "text-white/60")}>{stats.moisEnCours.impaye}</span>
                <span className="text-white/40">{stats.moisEnCours.enRetard ? "En retard" : "Pas encore payé"}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-white/30">La liste nominative est dans l&apos;onglet Rappels.</p>
          </div>
        )}
      </section>

      {/* 3. Mois par mois */}
      {periode === "saison" && (
        <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Mois par mois — saison {saison}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30">
                  <th className="px-3 py-2">Mois</th>
                  <th className="px-3 py-2 text-right">Dû</th>
                  <th className="px-3 py-2 text-right">Reçu</th>
                  <th className="px-3 py-2 text-right">Reste</th>
                  <th className="px-3 py-2 text-right">Recouvr.</th>
                  <th className="px-3 py-2 text-center">À jour</th>
                  <th className="px-3 py-2 text-center">Pas à jour</th>
                </tr>
              </thead>
              <tbody>
                {stats.lignes.map(l => {
                  const taux = l.du > 0 ? (l.recu / l.du) * 100 : 0;
                  return (
                    <tr key={l.month} className={cn("border-b border-white/5", !l.echu && "opacity-40")}>
                      <td className="px-3 py-2 text-sm font-medium text-white">{formatMonth(l.month)}{l.month === moisActuel && <span className="ml-2 text-[10px] text-fiver-green">en cours</span>}</td>
                      {l.echu ? (
                        <>
                          <td className="px-3 py-2 text-right text-sm text-white/70">{l.du.toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-fiver-green">{l.recu.toLocaleString("fr-FR")}</td>
                          <td className="px-3 py-2 text-right text-sm text-red-400">{l.reste.toLocaleString("fr-FR")}</td>
                          <td className={cn("px-3 py-2 text-right text-sm font-bold", couleurTaux(taux))}>{l.du > 0 ? `${taux.toFixed(0)} %` : "—"}</td>
                          <td className="px-3 py-2 text-center text-sm font-bold text-green-400">{l.aJour}</td>
                          <td className={cn("px-3 py-2 text-center text-sm font-bold", l.enRetard ? "text-red-400" : "text-white/50")}>{l.partiel + l.impaye}</td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-3 py-2 text-center text-xs text-white/40">
                          À venir{l.recu > 0 ? ` — ${mru(l.recu)} payés d'avance` : ""}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 4. Frais d'inscription */}
        <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">🎟️ Frais d&apos;inscription — saison entière</h3>
          <p className="mb-4 mt-1 text-[11px] text-white/35">Inscription + équipement (nouveaux), équipement seul (anciens).</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-white/50">Prévu</span><span className="text-white/80">{mru(stats.fraisPrevu)}</span></div>
            <div className="flex justify-between"><span className="text-white/50">Encaissé</span><span className="font-bold text-fiver-green">{mru(stats.fraisEncaisse)}</span></div>
            <div className="flex justify-between"><span className="text-white/50">Reste à encaisser</span><span className="font-bold text-red-400">{mru(stats.fraisReste)}</span></div>
            <div className="flex justify-between"><span className="text-white/50">Enfants ayant réglé</span><span className="text-white/80">{stats.nbFraisPayes} / {stats.total}</span></div>
          </div>
        </section>

        {/* 5. Moyens de paiement */}
        <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💳 Moyens de paiement — {libellePeriode}</h3>
          <p className="mb-4 mt-1 text-[11px] text-white/35">
            {periode === "saison" ? "Mensualités de la saison + frais d'inscription." : "Mensualités de ce mois."}
          </p>
          <div className="flex flex-col gap-2 text-sm">
            {stats.parMoyen.length === 0 ? (
              <p className="text-xs italic text-white/30">Aucun paiement enregistré.</p>
            ) : stats.parMoyen.map(([moyen, total]) => (
              <div key={moyen} className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">{moyen}</span><span className="font-medium text-white">{mru(total)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-center text-[11px] text-white/30">
        Pour l&apos;argent encaissé mois par mois, toutes activités confondues (Arena + Academy), voir la page Rapports.
      </p>
    </div>
  );
}
