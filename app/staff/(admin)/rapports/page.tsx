"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

function getMonthsBetween(start: string, end: string) {
  const result = [];
  let current = new Date(start + "-01");
  const endDate = new Date(end + "-01");
  while (current <= endDate) {
    result.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
    current.setMonth(current.getMonth() + 1);
  }
  return result;
}

function formatMonth(val: string) {
  const d = new Date(val + "-01");
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface Reservation {
  id: number;
  date: string;
  status: string;
}

interface AcademyReg {
  id: number;
  created_at: string;
  tarif_football: number;
  tarif_loisirs: number;
  tarif_total: number;
  montant_paye: number;
  football: boolean;
  inscription_fin_de_mois: boolean;
  frais_inscription: number;
  frais_inscription_paye: boolean;
  academy_payments_history: { mois_concerne: string; montant: number; moyen_paiement: string }[];
}

export default function RapportsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [academyRegs, setAcademyRegs] = useState<AcademyReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [startMonth, setStartMonth] = useState(`${now.getFullYear()}-01`);
  const [endMonth, setEndMonth] = useState(defaultMonth);
  const [activeTab, setActiveTab] = useState<"global" | "arena" | "academy">("global");

  useEffect(() => {
    async function fetchData() {
      const { data: settingsData } = await supabase.from("settings").select("key, value");
      if (settingsData) {
        const map = Object.fromEntries(settingsData.map(s => [s.key, s.value]));
        if (map.price_weekday) setPriceWeekday(parseInt(map.price_weekday));
        if (map.price_weekend) setPriceWeekend(parseInt(map.price_weekend));
      }

      const { data: resData } = await supabase.from("reservations").select("id, date, status").order("date", { ascending: false });
      setReservations(resData || []);

      const { data: academyData } = await supabase
        .from("academy_registrations")
        .select("*, academy_payments_history(*)");
      setAcademyRegs(academyData || []);

      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const safeStart = startMonth <= endMonth ? startMonth : endMonth;
    const safeEnd = startMonth <= endMonth ? endMonth : startMonth;
    const months = getMonthsBetween(safeStart, safeEnd);

    // ---- ARENA STATS ----
    const arenaMonthly = months.map(month => {
      const monthReservations = reservations.filter(r => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === month;
      });

      let totalResa = monthReservations.length;
      let paidResa = 0;
      let confirmedResa = 0;
      let cancelledResa = 0;
      let revenue = 0;

      monthReservations.forEach(r => {
        const d = new Date(r.date);
        if (r.status === "cancelled") {
          cancelledResa++;
        } else if (r.status === "paid") {
          paidResa++;
          const isWeekend = [0, 5, 6].includes(d.getDay());
          revenue += isWeekend ? priceWeekend : priceWeekday;
        } else if (r.status === "confirmed") {
          confirmedResa++;
        }
      });

      return { month, label: formatMonth(month), totalResa, paidResa, confirmedResa, cancelledResa, revenue };
    });

    const arenaTotalResa = arenaMonthly.reduce((s, m) => s + m.totalResa, 0);
    const arenaTotalPaid = arenaMonthly.reduce((s, m) => s + m.paidResa, 0);
    const arenaTotalConfirmed = arenaMonthly.reduce((s, m) => s + m.confirmedResa, 0);
    const arenaTotalCancelled = arenaMonthly.reduce((s, m) => s + m.cancelledResa, 0);
    const arenaTotalRevenue = arenaMonthly.reduce((s, m) => s + m.revenue, 0);

    // ---- ACADEMY STATS ----
    const academyMonthly = months.map(month => {
      let caTotal = 0;
      let totalPaye = 0;
      let nbPaye = 0;
      let nbNonPaye = 0;

      academyRegs.forEach(r => {
        const history = r.academy_payments_history || [];
        const isOff = history.some(h => h.mois_concerne === month && h.moyen_paiement === "OFF");
        if (isOff) return;

        if (r.created_at) {
          const c = new Date(r.created_at);
          const cm = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}`;
          if (month < cm) return;
          if (r.inscription_fin_de_mois && cm === month) return;
        }

        // Use effective tarif: tarif_football > tarif_total > 1000 (default)
        const effectiveTarif = (r.tarif_football && r.tarif_football > 0) ? r.tarif_football : ((r.tarif_total && r.tarif_total > 0) ? r.tarif_total : 1000);
        caTotal += effectiveTarif + (r.tarif_loisirs || 0);

        const hasHistory = history.length > 0;
        let paid = 0;
        
        if (hasHistory) {
          const payments = history.filter(h => h.mois_concerne === month && h.moyen_paiement !== "OFF");
          paid = payments.reduce((s, h) => s + h.montant, 0);
        } else {
          // Legacy fallback: attribute montant_paye to current month only
          const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          if (month === nowStr) {
            paid = (r.montant_paye || 0);
          }
        }
        totalPaye += paid;

        if (paid >= effectiveTarif + (r.tarif_loisirs || 0)) nbPaye++;
        else nbNonPaye++;
      });

      return { month, label: formatMonth(month), caTotal, totalPaye, taux: caTotal > 0 ? (totalPaye / caTotal * 100) : 0, nbPaye, nbNonPaye };
    });

    const academyTotalCA = academyMonthly.reduce((s, m) => s + m.caTotal, 0);
    const academyTotalPaye = academyMonthly.reduce((s, m) => s + m.totalPaye, 0);
    const academyTaux = academyTotalCA > 0 ? (academyTotalPaye / academyTotalCA * 100) : 0;
    const fraisEncaisses = academyRegs.filter(r => r.frais_inscription_paye).reduce((s, r) => s + (r.frais_inscription || 0), 0);

    const grandTotalRevenue = arenaTotalRevenue + academyTotalPaye + fraisEncaisses;

    return {
      months, arenaMonthly, arenaTotalResa, arenaTotalPaid, arenaTotalConfirmed, arenaTotalCancelled, arenaTotalRevenue,
      academyMonthly, academyTotalCA, academyTotalPaye, academyTaux, fraisEncaisses, grandTotalRevenue,
    };
  }, [reservations, academyRegs, startMonth, endMonth, priceWeekday, priceWeekend]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Rapports & Statistiques</h1>
        <p className="mt-1 text-sm text-white/40">Vue consolidée Arena + Académie.</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/50">Période du :</span>
        <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white focus:border-fiver-green focus:outline-none">
          {generateMonthOptions().map(o => (<option key={o.val} value={o.val} className="bg-[#1a1a1a] text-white">{o.label}</option>))}
        </select>
        <span className="text-sm text-white/50">au</span>
        <select value={endMonth} onChange={e => setEndMonth(e.target.value)} className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white focus:border-fiver-green focus:outline-none">
          {generateMonthOptions().map(o => (<option key={o.val} value={o.val} className="bg-[#1a1a1a] text-white">{o.label}</option>))}
        </select>
      </div>

      {/* GRAND TOTAL BANNER */}
      <div className="mb-6 rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-6">
        <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-fiver-green">💰 Revenus Totaux (Période)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/30">Arena (Payé)</p>
            <p className="mt-1 text-xl font-bold text-white">{stats.arenaTotalRevenue.toLocaleString()} <span className="text-sm text-white/40">MRU</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/30">Académie (Reçu)</p>
            <p className="mt-1 text-xl font-bold text-white">{stats.academyTotalPaye.toLocaleString()} <span className="text-sm text-white/40">MRU</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/30">Frais Inscription</p>
            <p className="mt-1 text-xl font-bold text-white">{stats.fraisEncaisses.toLocaleString()} <span className="text-sm text-white/40">MRU</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-fiver-green">TOTAL ENCAISSÉ</p>
            <p className="mt-1 text-2xl font-bold text-fiver-green">{stats.grandTotalRevenue.toLocaleString()} <span className="text-sm text-fiver-green/60">MRU</span></p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-6 flex border-b border-white/5">
        {([
          { key: "global" as const, label: "Vue Globale" },
          { key: "arena" as const, label: "🏟️ Arena (Terrains)" },
          { key: "academy" as const, label: "⚽ Académie" },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px", activeTab === tab.key ? "border-fiver-green text-fiver-green" : "border-transparent text-white/40 hover:text-white/70")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: GLOBAL */}
      {activeTab === "global" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">🏟️ Arena — Résumé Période</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-white/40">Total Réservations</span><span className="text-white font-bold">{stats.arenaTotalResa}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Payées</span><span className="text-green-400 font-bold">{stats.arenaTotalPaid}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Confirmées</span><span className="text-blue-400 font-bold">{stats.arenaTotalConfirmed}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Annulées</span><span className="text-red-400 font-bold">{stats.arenaTotalCancelled}</span></div>
                <hr className="my-1 border-white/5" />
                <div className="flex justify-between"><span className="text-fiver-green font-bold">Revenus Arena</span><span className="text-fiver-green font-bold">{stats.arenaTotalRevenue.toLocaleString()} MRU</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">⚽ Académie — Résumé Période</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-white/40">CA Attendu (Période)</span><span className="text-white font-bold">{stats.academyTotalCA.toLocaleString()} MRU</span></div>
                <div className="flex justify-between"><span className="text-white/40">Paiements Reçus</span><span className="text-fiver-green font-bold">{stats.academyTotalPaye.toLocaleString()} MRU</span></div>
                <div className="flex justify-between"><span className="text-white/40">Taux de Recouvrement</span><span className={cn("font-bold", stats.academyTaux >= 70 ? "text-green-400" : stats.academyTaux >= 40 ? "text-amber-400" : "text-red-400")}>{stats.academyTaux.toFixed(1)}%</span></div>
                <hr className="my-1 border-white/5" />
                <div className="flex justify-between"><span className="text-amber-400">🎟️ Frais d&apos;inscription encaissés</span><span className="text-amber-400 font-bold">{stats.fraisEncaisses.toLocaleString()} MRU</span></div>
              </div>
            </div>
          </div>

          {stats.months.length > 1 && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Détail Mois par Mois — Revenus Combinés</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30">
                      <th className="px-3 py-2">Mois</th>
                      <th className="px-3 py-2 text-right">Arena (Payé)</th>
                      <th className="px-3 py-2 text-right">Académie (Reçu)</th>
                      <th className="px-3 py-2 text-right">Total Mois</th>
                      <th className="px-3 py-2 text-center">Résa Arena</th>
                      <th className="px-3 py-2 text-center">Taux Académie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.months.map((month, i) => {
                      const arena = stats.arenaMonthly[i];
                      const academy = stats.academyMonthly[i];
                      const totalMois = arena.revenue + academy.totalPaye;
                      return (
                        <tr key={month} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-sm font-medium text-white">{formatMonth(month)}</td>
                          <td className="px-3 py-2 text-sm text-right text-blue-400 font-medium">{arena.revenue.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-right text-emerald-400 font-medium">{academy.totalPaye.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-right text-fiver-green font-bold">{totalMois.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-center text-white/60">{arena.paidResa + arena.confirmedResa}</td>
                          <td className={cn("px-3 py-2 text-sm text-center font-bold", academy.taux >= 70 ? "text-green-400" : academy.taux >= 40 ? "text-amber-400" : "text-red-400")}>{academy.taux.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-white/[0.03] font-bold">
                      <td className="px-3 py-2 text-sm text-white">TOTAL</td>
                      <td className="px-3 py-2 text-sm text-right text-blue-400">{stats.arenaTotalRevenue.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm text-right text-emerald-400">{stats.academyTotalPaye.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm text-right text-fiver-green">{(stats.arenaTotalRevenue + stats.academyTotalPaye).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm text-center text-white/60">{stats.arenaTotalPaid + stats.arenaTotalConfirmed}</td>
                      <td className={cn("px-3 py-2 text-sm text-center", stats.academyTaux >= 70 ? "text-green-400" : stats.academyTaux >= 40 ? "text-amber-400" : "text-red-400")}>{stats.academyTaux.toFixed(0)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ARENA */}
      {activeTab === "arena" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Total Réservations</p><p className="mt-1 text-2xl font-bold text-white">{stats.arenaTotalResa}</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Payées</p><p className="mt-1 text-2xl font-bold text-green-400">{stats.arenaTotalPaid}</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Annulées</p><p className="mt-1 text-2xl font-bold text-red-400">{stats.arenaTotalCancelled}</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Revenus</p><p className="mt-1 text-2xl font-bold text-fiver-green">{stats.arenaTotalRevenue.toLocaleString()} <span className="text-sm text-fiver-green/50">MRU</span></p></div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
            <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Détail Arena Mois par Mois</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead><tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30"><th className="px-3 py-2">Mois</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Payées</th><th className="px-3 py-2 text-right">Confirmées</th><th className="px-3 py-2 text-right">Annulées</th><th className="px-3 py-2 text-right">Revenus</th></tr></thead>
                <tbody>
                  {stats.arenaMonthly.map(m => (
                    <tr key={m.month} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-sm font-medium text-white">{m.label}</td>
                      <td className="px-3 py-2 text-sm text-right text-white/70">{m.totalResa}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-400 font-medium">{m.paidResa}</td>
                      <td className="px-3 py-2 text-sm text-right text-blue-400">{m.confirmedResa}</td>
                      <td className="px-3 py-2 text-sm text-right text-red-400">{m.cancelledResa}</td>
                      <td className="px-3 py-2 text-sm text-right text-fiver-green font-bold">{m.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-white/[0.03] font-bold">
                    <td className="px-3 py-2 text-sm text-white">TOTAL</td>
                    <td className="px-3 py-2 text-sm text-right text-white">{stats.arenaTotalResa}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-400">{stats.arenaTotalPaid}</td>
                    <td className="px-3 py-2 text-sm text-right text-blue-400">{stats.arenaTotalConfirmed}</td>
                    <td className="px-3 py-2 text-sm text-right text-red-400">{stats.arenaTotalCancelled}</td>
                    <td className="px-3 py-2 text-sm text-right text-fiver-green">{stats.arenaTotalRevenue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ACADEMY */}
      {activeTab === "academy" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">CA Attendu</p><p className="mt-1 text-2xl font-bold text-white">{stats.academyTotalCA.toLocaleString()} <span className="text-sm text-white/40">MRU</span></p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Paiements Reçus</p><p className="mt-1 text-2xl font-bold text-fiver-green">{stats.academyTotalPaye.toLocaleString()} <span className="text-sm text-fiver-green/50">MRU</span></p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Taux Recouvrement</p><p className={cn("mt-1 text-2xl font-bold", stats.academyTaux >= 70 ? "text-green-400" : stats.academyTaux >= 40 ? "text-amber-400" : "text-red-400")}>{stats.academyTaux.toFixed(1)}%</p></div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4"><p className="text-[10px] uppercase tracking-wide text-white/30">Frais Inscription</p><p className="mt-1 text-2xl font-bold text-amber-400">{stats.fraisEncaisses.toLocaleString()} <span className="text-sm text-amber-400/50">MRU</span></p></div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
            <h3 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">📅 Détail Académie Mois par Mois</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead><tr className="border-b border-white/5 text-left text-[10px] font-medium uppercase tracking-wide text-white/30"><th className="px-3 py-2">Mois</th><th className="px-3 py-2 text-right">CA Attendu</th><th className="px-3 py-2 text-right">Reçu</th><th className="px-3 py-2 text-right">Recouvrement</th><th className="px-3 py-2 text-center">À jour</th><th className="px-3 py-2 text-center">Non payé</th></tr></thead>
                <tbody>
                  {stats.academyMonthly.map(m => (
                    <tr key={m.month} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-sm font-medium text-white">{m.label}</td>
                      <td className="px-3 py-2 text-sm text-right text-white/70">{m.caTotal.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm text-right text-fiver-green font-medium">{m.totalPaye.toLocaleString()}</td>
                      <td className={cn("px-3 py-2 text-sm text-right font-bold", m.taux >= 70 ? "text-green-400" : m.taux >= 40 ? "text-amber-400" : "text-red-400")}>{m.taux.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-sm text-center text-green-400 font-bold">{m.nbPaye}</td>
                      <td className="px-3 py-2 text-sm text-center text-red-400 font-bold">{m.nbNonPaye}</td>
                    </tr>
                  ))}
                  <tr className="bg-white/[0.03] font-bold">
                    <td className="px-3 py-2 text-sm text-white">TOTAL</td>
                    <td className="px-3 py-2 text-sm text-right text-white">{stats.academyTotalCA.toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-right text-fiver-green">{stats.academyTotalPaye.toLocaleString()}</td>
                    <td className={cn("px-3 py-2 text-sm text-right", stats.academyTaux >= 70 ? "text-green-400" : stats.academyTaux >= 40 ? "text-amber-400" : "text-red-400")}>{stats.academyTaux.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-sm text-center text-green-400">{stats.academyMonthly.reduce((s, m) => s + m.nbPaye, 0)}</td>
                    <td className="px-3 py-2 text-sm text-center text-red-400">{stats.academyMonthly.reduce((s, m) => s + m.nbNonPaye, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
