"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Registration, Tarifs } from "./page";
import { getStatutMoisEnCours } from "./tab-inscriptions";

function generateMonthOptions() {
  const options = [{ val: "all", label: "Toute l'année (Historique)" }];
  const now = new Date();
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    options.push({ val, label: formattedLabel });
  }
  return options;
}

const CATEGORIES = ["U5", "U7", "U9", "U11", "U12F", "U13", "U15", "U15F"];
const MOYENS_PAIEMENT = ["Bankily", "Masrvi", "Cash", "Autre"];

export function TabDashboard({ registrations, tarifs }: { registrations: Registration[]; tarifs: Tarifs }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [targetMonth, setTargetMonth] = useState(defaultMonth);

  const stats = useMemo(() => {
    const total = registrations.length;
    const football = registrations.filter(r => r.football).length;
    const loisirs = registrations.filter(r => r.centre_loisirs).length;
    const combo = registrations.filter(r => r.football && r.centre_loisirs).length;
    const garcons = registrations.filter(r => r.sexe === "M").length;
    const filles = registrations.filter(r => r.sexe === "F").length;

    const currentMonth = targetMonth;

    const byCat = CATEGORIES.map(cat => {
      const players = registrations.filter(r => r.categorie_foot === cat);
      const g = players.filter(r => r.sexe === "M").length;
      const f = players.filter(r => r.sexe === "F").length;
      const ca = players.reduce((s, p) => {
        const history = p.academy_payments_history || [];
        if (targetMonth === "all") {
          const createdAt = p.created_at ? new Date(p.created_at) : new Date();
          let monthsReg = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1;
          if (p.inscription_fin_de_mois) monthsReg = Math.max(0, monthsReg - 1);
          const offMonths = new Set(history.filter(h => h.moyen_paiement === "OFF").map(h => h.mois_concerne)).size;
          monthsReg = Math.max(0, monthsReg - offMonths);
          return s + (p.tarif_football || 0) * monthsReg;
        } else {
          const isOff = history.some(h => h.mois_concerne === targetMonth && h.moyen_paiement === "OFF");
          return s + (isOff ? 0 : (p.tarif_football || 0));
        }
      }, 0);
      return { name: cat, nb: players.length, g, f, pct: football > 0 ? (players.length / football * 100) : 0, ca };
    });

    const paymentsToConsider = targetMonth === "all"
      ? registrations.flatMap(r => (r.academy_payments_history || []).filter(h => h.moyen_paiement !== "OFF"))
      : registrations.flatMap(r => (r.academy_payments_history || []).filter(h => h.mois_concerne === targetMonth && h.moyen_paiement !== "OFF"));

    const byMoyen = MOYENS_PAIEMENT.map(m => ({
      name: m,
      total: paymentsToConsider.filter(h => h.moyen_paiement === m).reduce((s, h) => s + h.montant, 0)
    })).filter(m => m.total > 0);

    let caFootball = 0;
    let caLoisirs = 0;
    let totalPaye = 0;

    registrations.forEach(r => {
      const history = r.academy_payments_history || [];
      
      if (targetMonth === "all") {
        const createdAt = r.created_at ? new Date(r.created_at) : new Date();
        let monthsReg = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1;
        if (r.inscription_fin_de_mois) monthsReg = Math.max(0, monthsReg - 1);
        const offMonths = new Set(history.filter(h => h.moyen_paiement === "OFF").map(h => h.mois_concerne)).size;
        monthsReg = Math.max(0, monthsReg - offMonths);
        
        caFootball += (r.tarif_football || 0) * monthsReg;
        caLoisirs += (r.tarif_loisirs || 0) * monthsReg;
        totalPaye += history.filter(h => h.moyen_paiement !== "OFF").reduce((s, h) => s + h.montant, 0);
      } else {
        const isOff = history.some(h => h.mois_concerne === targetMonth && h.moyen_paiement === "OFF");
        if (!isOff) {
          caFootball += (r.tarif_football || 0);
          caLoisirs += (r.tarif_loisirs || 0);
        }
        const payments = history.filter(h => h.mois_concerne === targetMonth && h.moyen_paiement !== "OFF");
        totalPaye += payments.reduce((s, h) => s + h.montant, 0);
      }
    });

    const caTotal = caFootball + caLoisirs;

    // Frais d'inscription
    const fraisEncaisses = registrations.filter(r => r.frais_inscription_paye).reduce((s, r) => s + (r.frais_inscription || 0), 0);
    const fraisNonPayes = registrations.filter(r => !r.frais_inscription_paye).length;

    const tauxRecouvrement = caTotal > 0 ? (totalPaye / caTotal * 100) : 0;

    // Use unified status logic
    const statusCounts = registrations.reduce((acc, r) => {
      const evalMonth = targetMonth === "all" ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : targetMonth;
      const history = r.academy_payments_history || [];
      const isOff = history.some(h => h.mois_concerne === evalMonth && h.moyen_paiement === "OFF");
      if (isOff) return acc;

      const s = getStatutMoisEnCours(r, tarifs.jourLimitePaiement, tarifs.tarifFoot, evalMonth);
      
      if (s.status === "ok" || s.status === "offert") acc.aJour++;
      else if (s.status === "retard") acc.enRetard++;
      else acc.enAttente++;

      if (s.status === "ok" || s.status === "offert") acc.nbPaye++;
      else if (s.status === "partiel") acc.nbPartiel++;
      else acc.nbAttente++;
      
      return acc;
    }, { aJour: 0, enRetard: 0, enAttente: 0, nbPaye: 0, nbPartiel: 0 });

    const isAfterDeadline = now.getDate() > tarifs.jourLimitePaiement;

    return { 
      total, football, loisirs, combo, garcons, filles, byCat, byMoyen, 
      caFootball, caLoisirs, caTotal, totalPaye, fraisEncaisses, fraisNonPayes, 
      nbPaye: statusCounts.nbPaye, nbPartiel: statusCounts.nbPartiel, nbAttente: statusCounts.enAttente, 
      tauxRecouvrement, 
      aJour: statusCounts.aJour, enRetard: statusCounts.enRetard, enAttente: statusCounts.enAttente,
      isAfterDeadline 
    };
  }, [registrations, tarifs, targetMonth]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <select 
          value={targetMonth} 
          onChange={e => setTargetMonth(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white focus:border-fiver-green focus:outline-none"
        >
          {generateMonthOptions().map(o => (
            <option key={o.val} value={o.val} className="bg-[#1a1a1a] text-white">{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total Inscrits", val: stats.total, cls: "text-white" },
          { label: "Football", val: stats.football, cls: "text-fiver-green" },
          { label: "Loisirs", val: stats.loisirs, cls: "text-emerald-400" },
          { label: "Combo", val: stats.combo, cls: "text-blue-400" },
          { label: "Garçons", val: stats.garcons, cls: "text-blue-300" },
          { label: "Filles", val: stats.filles, cls: "text-pink-400" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-wide text-white/30">{k.label}</p>
            <p className={cn("mt-1 font-[var(--font-heading)] text-2xl font-bold", k.cls)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* By Category */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Répartition par catégorie (Football)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30">
                <th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Inscrits</th><th className="px-3 py-2">Garçons</th><th className="px-3 py-2">Filles</th><th className="px-3 py-2">% Total</th><th className="px-3 py-2">{targetMonth === "all" ? "CA Historique" : "CA Mensuel"}</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCat.map(c => (
                <tr key={c.name} className="border-b border-white/5">
                  <td className="px-3 py-2 text-xs font-bold text-fiver-green">{c.name}</td>
                  <td className="px-3 py-2 text-sm text-white/70">{c.nb}</td>
                  <td className="px-3 py-2 text-sm text-blue-300">{c.g}</td>
                  <td className="px-3 py-2 text-sm text-pink-400">{c.f}</td>
                  <td className="px-3 py-2 text-sm text-white/50">{c.pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-sm font-medium text-white/70">{c.ca.toLocaleString()} MRU</td>
                </tr>
              ))}
              <tr className="bg-white/[0.03] font-bold">
                <td className="px-3 py-2 text-xs text-white">TOTAL</td>
                <td className="px-3 py-2 text-sm text-white">{stats.football}</td>
                <td className="px-3 py-2 text-sm text-white">{stats.garcons}</td>
                <td className="px-3 py-2 text-sm text-white">{stats.filles}</td>
                <td className="px-3 py-2 text-sm text-white">100%</td>
                <td className="px-3 py-2 text-sm text-fiver-green">{stats.byCat.reduce((a, c) => a + c.ca, 0).toLocaleString()} MRU</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
            <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💰 Synthèse Financière</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-white/40">{targetMonth === "all" ? "CA Football Historique" : "CA Football Mensuel"}</span><span className="text-white/70">{stats.caFootball.toLocaleString()} MRU</span></div>
              <div className="flex justify-between"><span className="text-white/40">{targetMonth === "all" ? "CA Loisirs Historique" : "CA Loisirs Mensuel"}</span><span className="text-white/70">{stats.caLoisirs.toLocaleString()} MRU</span></div>
              <hr className="my-1 border-white/5" />
              <div className="flex justify-between font-bold"><span className="text-fiver-green">Paiements Reçus {targetMonth === "all" ? "(Total)" : "(Mois)"}</span><span className="text-fiver-green">{stats.totalPaye.toLocaleString()} MRU</span></div>
              <div className="flex justify-between"><span className="text-white/40">Taux de Recouvrement</span><span className={cn("font-bold", stats.tauxRecouvrement >= 70 ? "text-green-400" : stats.tauxRecouvrement >= 40 ? "text-amber-400" : "text-red-400")}>{stats.tauxRecouvrement.toFixed(1)}%</span></div>
              <hr className="my-1 border-white/5" />
              <div className="flex justify-between"><span className="text-amber-400">🎟️ Frais d'inscription encaissés</span><span className="text-amber-400 font-bold">{stats.fraisEncaisses.toLocaleString()} MRU</span></div>
              <div className="flex justify-between"><span className="text-white/40">Frais non payés</span><span className="text-red-400">{stats.fraisNonPayes} joueur(s)</span></div>
            </div>
          </div>
          
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5 flex-1">
            <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">💳 Moyens de Paiement (Encaissé)</h2>
            <div className="flex flex-col gap-3 text-sm">
              {stats.byMoyen.length === 0 ? <p className="text-xs text-white/30 italic">Aucun paiement enregistré.</p> : stats.byMoyen.map(m => (
                <div key={m.name} className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">{m.name}</span><span className="text-white font-medium">{m.total.toLocaleString()} MRU</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📊 Suivi Paiement {targetMonth === "all" ? "du Mois Actuel" : "du Mois"}</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: "Payé", val: stats.nbPaye, cls: "bg-green-500", total: stats.total },
              { label: "Partiel", val: stats.nbPartiel, cls: "bg-amber-500", total: stats.total },
              { label: "En attente", val: stats.nbAttente, cls: "bg-red-500", total: stats.total },
            ].map(p => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-white/50">{p.label}</span><span className="text-white/70">{p.val}</span></div>
                <div className="h-2 rounded-full bg-white/5"><div className={cn("h-full rounded-full", p.cls)} style={{ width: `${p.total > 0 ? (p.val / p.total * 100) : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <hr className="my-6 border-white/5" />
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/30">Statut temps réel (jour {new Date().getDate()}/{tarifs.jourLimitePaiement})</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-sm bg-green-500/10 p-3 text-center"><span className="text-green-400 font-bold block text-lg">{stats.aJour}</span><p className="text-white/30 mt-1">À jour</p></div>
            <div className="rounded-sm bg-amber-500/10 p-3 text-center"><span className="text-amber-400 font-bold block text-lg">{stats.enAttente}</span><p className="text-white/30 mt-1">En attente</p></div>
            <div className="rounded-sm bg-red-500/10 p-3 text-center"><span className="text-red-400 font-bold block text-lg">{stats.enRetard}</span><p className="text-white/30 mt-1">En retard</p></div>
          </div>
          {stats.isAfterDeadline && (
            <div className="mt-4 rounded bg-red-500/10 border border-red-500/20 p-3 text-center">
              <p className="text-xs text-red-400 font-bold">⚠️ La deadline du {tarifs.jourLimitePaiement} est passée — {stats.enRetard} joueur(s) en retard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
