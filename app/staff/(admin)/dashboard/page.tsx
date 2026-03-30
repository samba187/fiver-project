"use client";

import { useState, useEffect } from "react";
import { CalendarCheck, DollarSign, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Reservation {
  id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  pitch: string;
  status: string;
}

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);
  const [totalSlotsDay, setTotalSlotsDay] = useState(16);

  useEffect(() => {
    async function fetchData() {
      const { data: settingsData } = await supabase.from("settings").select("key, value");
      if (settingsData) {
        const map = Object.fromEntries(settingsData.map((s) => [s.key, s.value]));
        if (map.price_weekday) setPriceWeekday(parseInt(map.price_weekday));
        if (map.price_weekend) setPriceWeekend(parseInt(map.price_weekend));
        
        const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
        const oH = parseInt((isWeekend ? map.weekend_open : map.weekday_open)?.split(":")[0] || "16");
        const cH = parseInt((isWeekend ? map.weekend_close : map.weekday_close)?.split(":")[0] || "0");
        const cHEff = cH === 0 ? 24 : cH;
        const totalHours = cHEff <= oH ? (24 - oH) + cHEff : cHEff - oH;
        setTotalSlotsDay(totalHours * 2);
      }
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      setReservations(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  const todayReservations = reservations.filter((r) => r.date === today && r.status !== "cancelled");
  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const paidToday = todayReservations.filter((r) => r.status === "paid").length;
  const activeToday = todayReservations.filter((r) => r.status === "confirmed" || r.status === "paid").length;
  
  const occupancyRate = totalSlotsDay > 0 ? Math.round((activeToday / totalSlotsDay) * 100) : 0;
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const currentPrice = isWeekend ? priceWeekend : priceWeekday;
  const revenue = paidToday * currentPrice;

  const kpiCards = [
    { label: "Réservations aujourd'hui", value: String(todayReservations.length), change: "", icon: CalendarCheck, color: "text-fiver-green" },
    { label: "Revenus du jour", value: `${revenue.toLocaleString()} MRU`, change: `${paidToday} payée(s)`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Taux d'occupation", value: `${occupancyRate}%`, change: `${activeToday}/${totalSlotsDay} créneaux`, icon: TrendingUp, color: "text-blue-400" },
    { label: "En attente", value: String(pendingCount), change: "", icon: Clock, color: "text-amber-400" },
  ];

  const upcomingReservations = reservations
    .filter((r) => r.date >= today && r.status !== "cancelled")
    .slice(0, 6);

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="rounded-full bg-fiver-green/10 px-2.5 py-1 text-xs font-medium text-fiver-green">Confirmée</span>;
      case "pending":
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">En attente</span>;
      case "cancelled":
        return <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">Annulée</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Vue d&apos;ensemble — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-white/40">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="font-[var(--font-heading)] text-2xl font-bold text-white">{kpi.value}</p>
            {kpi.change && <p className="mt-1 text-xs text-white/30">{kpi.change}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">
            Prochaines réservations
          </h2>
          <a href="/staff/reservations" className="flex items-center gap-1 text-xs text-fiver-green transition-colors hover:text-fiver-green/80">
            Voir tout <ChevronRight className="h-3 w-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Créneau</th>
                <th className="px-5 py-3">Terrain</th>
                <th className="px-5 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {upcomingReservations.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-white/30">Aucune réservation à venir.</td></tr>
              ) : (
                upcomingReservations.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{r.name}</p>
                      <p className="text-xs text-white/30">{r.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/60">
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.time}</td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.pitch}</td>
                    <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
