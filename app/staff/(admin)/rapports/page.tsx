"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, CalendarX, CheckCircle, CalendarCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Reservation {
  id: number;
  date: string;
  status: string;
}

export default function RapportsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch settings for accurate historical pricing
      const { data: settingsData } = await supabase.from("settings").select("key, value");
      if (settingsData) {
        const map = Object.fromEntries(settingsData.map(s => [s.key, s.value]));
        if (map.price_weekday) setPriceWeekday(parseInt(map.price_weekday));
        if (map.price_weekend) setPriceWeekend(parseInt(map.price_weekend));
      }

      // 2. Fetch ALL reservations
      const { data } = await supabase.from("reservations").select("id, date, status").order("date", { ascending: false });
      setReservations(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Compute metrics grouped by YYYY-MM
  const statsByMonth = useMemo(() => {
    const groups: Record<string, any> = {};

    reservations.forEach((r) => {
      const d = new Date(r.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          total: 0,
          actives: 0,
          cancelled: 0,
          revenue: 0,
        };
      }

      groups[monthKey].total++;
      
      if (r.status === "cancelled") {
        groups[monthKey].cancelled++;
      } else if (r.status === "paid") {
        groups[monthKey].actives++;
        const isWeekend = [0, 5, 6].includes(d.getDay());
        groups[monthKey].revenue += isWeekend ? priceWeekend : priceWeekday;
      } else if (r.status === "confirmed") {
        groups[monthKey].actives++; 
      }
    });

    // Sort descending by monthKey (e.g. 2026-04 before 2026-03)
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([key, val]) => ({ key, ...val }));
  }, [reservations, priceWeekday, priceWeekend]);

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
        <p className="mt-1 text-sm text-white/40">Analyse de vos performances mensuelles.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {statsByMonth.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-white/30">Aucune donnée historique trouvée.</div>
        ) : (
          statsByMonth.map((stat) => (
            <div key={stat.key} className="rounded-lg border border-white/5 bg-white/[0.02] p-6 transition-colors hover:border-white/10">
              <h2 className="mb-6 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-fiver-green capitalize">
                {stat.label}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="flex items-center gap-1.5 text-white/40 mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Total Résa.</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.total}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-blue-400/60 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Réussies</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{stat.actives}</p>
                  <p className="mt-1 text-xs text-blue-400/40">Payées + Confirmées</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-red-400/60 mb-2">
                    <CalendarX className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Annulées</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{stat.cancelled}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-fiver-green/70 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Revenus</span>
                  </div>
                  <p className="text-xl font-bold text-fiver-green sm:text-2xl">{new Intl.NumberFormat('fr-FR').format(stat.revenue)}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-fiver-green/50">MRU</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
