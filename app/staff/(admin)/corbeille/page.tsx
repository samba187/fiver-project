"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Reservation {
  id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  pitch: string;
  status: string;
  payment_receiver?: string;
  cancellation_reason?: string;
}

export default function CorbeillePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDeleted() {
      // Only fetch records marked specifically as deleted (soft-deleted)
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "deleted")
        .order("date", { ascending: false })
        .order("time", { ascending: true });

      setReservations(data || []);
      setLoading(false);
    }
    fetchDeleted();
  }, []);

  const filtered = reservations.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.phone.includes(search)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-red-500" /> Corbeille
          </h1>

        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Aucune suppression enregistrée.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="relative rounded-lg border border-red-500/20 bg-red-500/5 p-4 opacity-80 backdrop-blur-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{r.name}</p>
                  <p className="text-xs text-white/30">{r.phone}</p>
                </div>
                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">Supprimée</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                <span>📅 {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                <span>🕐 {r.time}</span>
                <span>⚽ {r.pitch}</span>
              </div>
              {r.payment_receiver && <div className="mb-1 text-xs italic text-blue-400">Était Encaissé par : {r.payment_receiver}</div>}
              {r.cancellation_reason && <div className="text-xs italic text-red-500">Raison enregistrée : {r.cancellation_reason}</div>}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-red-500/20 bg-red-500/[0.02] md:block opacity-90">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-red-500/10 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Créneau</th>
                <th className="px-5 py-3">Terrain</th>
                <th className="px-5 py-3">Raison / Encaissement</th>
                <th className="px-5 py-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">Aucune suppression enregistrée.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-red-500/5 transition-colors hover:bg-red-500/10">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{r.name}</p>
                      <p className="text-xs text-white/30">{r.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.time}</td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.pitch}</td>
                    <td className="px-5 py-3.5">
                      {r.payment_receiver && <div className="text-[10px] text-blue-400/80 mb-0.5">Était encaissé par: {r.payment_receiver}</div>}
                      {r.cancellation_reason && <div className="text-[10px] text-red-400/80 uppercase">Motif : {r.cancellation_reason}</div>}
                      {!r.payment_receiver && !r.cancellation_reason && <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">Supprimée</span>
                    </td>
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
