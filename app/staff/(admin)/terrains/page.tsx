"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { LayoutGrid, CheckCircle, Wrench, ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Pitch {
  id: string;
  name: string;
  status: "available" | "maintenance";
  surface: string;
  dimensions: string;
}

interface Reservation {
  id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  pitch: string;
  status: string;
  payment_method?: string;
  payment_confirmed?: boolean;
  amount_paid?: number;
  total_price?: number;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TOTAL_SLOTS_PER_DAY = 17;

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function TerrainsPage() {
  const [pitches, setPitches] = useState<Pitch[]>([
    { id: "1", name: "Terrain 1", status: "available", surface: "Gazon synthétique 4ème génération", dimensions: "30m x 20m" },
    { id: "2", name: "Terrain 2", status: "available", surface: "Gazon synthétique 4ème génération", dimensions: "30m x 20m" },
  ]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pitchFilter, setPitchFilter] = useState<string>("all");

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const fetchData = useCallback(async () => {
    // Fetch pitch statuses
    const { data: settingsData } = await supabase.from("settings").select("key, value").in("key", ["pitch_1_status", "pitch_2_status"]);
    if (settingsData) {
      const map = Object.fromEntries(settingsData.map((s) => [s.key, s.value]));
      setPitches((prev) => prev.map((p) => ({
        ...p,
        status: (p.id === "1" ? map.pitch_1_status : map.pitch_2_status) as "available" | "maintenance" || p.status,
      })));
    }

    // Fetch reservations for the month
    const startDate = fmtDate(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endDate = fmtDate(viewYear, viewMonth, lastDay);

    const { data } = await supabase
      .from("reservations")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("status", "deleted")
      .neq("status", "cancelled")
      .order("time", { ascending: true });

    setReservations(data || []);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleStatus(id: string) {
    const pitch = pitches.find((p) => p.id === id);
    if (!pitch) return;
    const newStatus = pitch.status === "available" ? "maintenance" : "available";
    const settingKey = id === "1" ? "pitch_1_status" : "pitch_2_status";
    const { data: existing } = await supabase.from("settings").select("id").eq("key", settingKey).single();
    if (existing) {
      await supabase.from("settings").update({ value: newStatus }).eq("key", settingKey);
    } else {
      await supabase.from("settings").insert({ key: settingKey, value: newStatus });
    }
    setPitches((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  }

  // Group reservations by date
  const resByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      const filtered = pitchFilter === "all" || r.pitch === pitchFilter;
      if (filtered) {
        if (!map[r.date]) map[r.date] = [];
        map[r.date].push(r);
      }
    });
    return map;
  }, [reservations, pitchFilter]);

  const selectedDateStr = selectedDay ? fmtDate(viewYear, viewMonth, selectedDay) : null;
  const selectedDayReservations = selectedDateStr ? (resByDate[selectedDateStr] || []) : [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <span className="rounded-full bg-fiver-green/10 px-2 py-0.5 text-xs font-medium text-fiver-green">Confirmée</span>;
      case "paid": return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">💰 Payée</span>;
      case "pending": return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">En attente</span>;
      default: return null;
    }
  };

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Gestion des terrains</h1>
        <p className="mt-1 text-sm text-white/40">Gérez la disponibilité et consultez le calendrier de vos terrains.</p>
      </div>

      {/* Pitch Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {pitches.map((pitch) => (
          <div key={pitch.id} className={cn("rounded-lg border p-5 transition-colors", pitch.status === "available" ? "border-fiver-green/20 bg-fiver-green/5" : "border-amber-500/20 bg-amber-500/5")}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", pitch.status === "available" ? "bg-fiver-green/10" : "bg-amber-500/10")}>
                  <LayoutGrid className={cn("h-5 w-5", pitch.status === "available" ? "text-fiver-green" : "text-amber-400")} />
                </div>
                <div>
                  <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase text-white">{pitch.name}</h3>
                  <p className="text-xs text-white/40">{pitch.dimensions}</p>
                </div>
              </div>
              {pitch.status === "available" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-fiver-green"><CheckCircle className="h-3.5 w-3.5" /> Disponible</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400"><Wrench className="h-3.5 w-3.5" /> Maintenance</span>
              )}
            </div>
            <p className="mb-4 text-sm text-white/50">{pitch.surface}</p>
            <button onClick={() => toggleStatus(pitch.id)} className={cn("w-full rounded-sm py-2.5 text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-90", pitch.status === "available" ? "bg-amber-500/20 text-amber-400" : "bg-fiver-green/20 text-fiver-green")}>
              {pitch.status === "available" ? "Mettre en maintenance" : "Remettre disponible"}
            </button>
          </div>
        ))}
      </div>

      {/* Monthly Calendar */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02]">
        <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Calendrier des réservations</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-sm p-1.5 text-white/40 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[140px] text-center text-xs font-semibold uppercase tracking-wide text-white">{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="rounded-sm p-1.5 text-white/40 hover:bg-white/5 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-1 rounded-sm border border-white/10 bg-white/5 p-0.5">
              {[{ key: "all", label: "Tous" }, { key: "Terrain 1", label: "T1" }, { key: "Terrain 2", label: "T2" }].map(f => (
                <button key={f.key} onClick={() => setPitchFilter(f.key)}
                  className={cn("rounded-sm px-2 py-1 text-xs font-medium transition-colors", pitchFilter === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0 lg:flex-row">
          {/* Calendar Grid */}
          <div className="flex-1 p-4">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-white/30">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`pad-${idx}`} className="aspect-square" />;
                const dateStr = fmtDate(viewYear, viewMonth, day);
                const dayRes = resByDate[dateStr] || [];
                const count = dayRes.length;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = selectedDay === day;
                const maxSlots = pitchFilter === "all" ? TOTAL_SLOTS_PER_DAY * 2 : TOTAL_SLOTS_PER_DAY;
                const ratio = maxSlots > 0 ? count / maxSlots : 0;

                let dotColor = "bg-white/10";
                if (count > 0 && ratio < 0.5) dotColor = "bg-fiver-green";
                else if (ratio >= 0.5 && ratio < 1) dotColor = "bg-amber-400";
                else if (ratio >= 1) dotColor = "bg-red-400";

                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 rounded-sm p-1 transition-colors aspect-square",
                      isSelected ? "bg-fiver-green/20 ring-1 ring-fiver-green" : "hover:bg-white/5",
                      isToday && !isSelected && "ring-1 ring-white/20"
                    )}>
                    <span className={cn("text-sm font-medium", isToday ? "text-fiver-green" : "text-white/70")}>{day}</span>
                    {count > 0 && (
                      <div className="flex items-center gap-1">
                        <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                        <span className="text-[9px] font-medium text-white/40">{count}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-fiver-green" /> Peu réservé</div>
              <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Moyen</div>
              <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-red-400" /> Complet</div>
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="w-full border-t border-white/5 lg:w-72 lg:border-l lg:border-t-0">
            <div className="p-4">
              {selectedDay ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-[var(--font-heading)] text-xs font-semibold uppercase tracking-wide text-white">
                      {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </h3>
                    <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
                  </div>
                  {selectedDayReservations.length === 0 ? (
                    <p className="py-8 text-center text-xs text-white/30">Aucune réservation</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedDayReservations.map(r => (
                        <div key={r.id} className="rounded-sm border border-white/5 bg-white/[0.02] p-2.5">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-semibold text-fiver-green">{r.time}</span>
                            {statusBadge(r.status)}
                          </div>
                          <p className="text-xs font-medium text-white/80">{r.name}</p>
                          <p className="text-[10px] text-white/30">{r.phone} · {r.pitch}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-xs text-white/30">Sélectionnez un jour</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
