"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Check, X as XIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

const TIME_OPTIONS = ["16h-17h", "17h-18h", "18h-19h", "19h-20h", "20h-21h", "21h-22h", "22h-23h", "23h-00h"];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newRes, setNewRes] = useState({ name: "", phone: "", date: "", time: TIME_OPTIONS[0], pitch: "Terrain 1" });

  const fetchReservations = useCallback(async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: true });
    setReservations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  async function confirmRes(id: number) {
    await supabase.from("reservations").update({ status: "confirmed" }).eq("id", id);
    fetchReservations();
  }

  async function markPaid(id: number) {
    await supabase.from("reservations").update({ status: "paid" }).eq("id", id);
    fetchReservations();
  }

  async function cancelRes(id: number) {
    await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
    fetchReservations();
  }

  async function deleteRes(id: number) {
    await supabase.from("reservations").delete().eq("id", id);
    fetchReservations();
  }

  async function addReservation() {
    if (!newRes.name || !newRes.phone || !newRes.date) return;
    await supabase.from("reservations").insert({
      name: newRes.name,
      phone: newRes.phone,
      date: newRes.date,
      time: newRes.time,
      pitch: newRes.pitch,
      status: "confirmed",
    });
    // Also upsert client
    const { data: existing } = await supabase.from("clients").select("id, total_bookings").eq("phone", newRes.phone).single();
    if (existing) {
      await supabase.from("clients").update({ total_bookings: existing.total_bookings + 1, last_booking: newRes.date, name: newRes.name }).eq("id", existing.id);
    } else {
      await supabase.from("clients").insert({ name: newRes.name, phone: newRes.phone, total_bookings: 1, last_booking: newRes.date });
    }
    setNewRes({ name: "", phone: "", date: "", time: TIME_OPTIONS[0], pitch: "Terrain 1" });
    setShowAdd(false);
    fetchReservations();
  }

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.phone.includes(search)) return false;
      return true;
    });
  }, [reservations, search, filterStatus]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="rounded-full bg-fiver-green/10 px-2.5 py-1 text-xs font-medium text-fiver-green">Confirmée</span>;
      case "paid":
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">💰 Payée</span>;
      case "pending":
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">En attente</span>;
      case "cancelled":
        return <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">Annulée</span>;
      default:
        return null;
    }
  };

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Réservations</h1>
          <p className="mt-1 text-sm text-white/40">{reservations.length} réservation(s) au total</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 rounded-sm bg-fiver-green px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" /> Nouvelle
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 animate-step rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fiver-green">Ajouter une réservation</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="text" placeholder="Nom complet" value={newRes.name} onChange={(e) => setNewRes({ ...newRes, name: e.target.value })} className={inputClass} />
            <input type="tel" placeholder="+222 XX XX XX XX" value={newRes.phone} onChange={(e) => setNewRes({ ...newRes, phone: e.target.value })} className={inputClass} />
            <input type="date" value={newRes.date} onChange={(e) => setNewRes({ ...newRes, date: e.target.value })} className={inputClass} />
            <select value={newRes.time} onChange={(e) => setNewRes({ ...newRes, time: e.target.value })} className={inputClass}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={newRes.pitch} onChange={(e) => setNewRes({ ...newRes, pitch: e.target.value })} className={inputClass}>
              <option value="Terrain 1">Terrain 1</option>
              <option value="Terrain 2">Terrain 2</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={addReservation} className="rounded-sm bg-fiver-green px-4 py-2 text-sm font-semibold text-fiver-black hover:opacity-90">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70">Annuler</button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher par nom ou téléphone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, { key: "pending", label: "En attente" }, { key: "confirmed", label: "Confirmées" }, { key: "paid", label: "Payées" }, { key: "cancelled", label: "Annulées" }].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("rounded-sm px-3 py-1.5 text-xs font-medium transition-colors", filterStatus === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Créneau</th>
                <th className="px-5 py-3">Terrain</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">Aucune réservation trouvée.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{r.name}</p>
                      <p className="text-xs text-white/30">{r.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.time}</td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{r.pitch}</td>
                    <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "pending" && (
                          <button onClick={() => confirmRes(r.id)} className="rounded-sm p-1.5 text-fiver-green/60 transition-colors hover:bg-fiver-green/10 hover:text-fiver-green" title="Confirmer"><Check className="h-4 w-4" /></button>
                        )}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <button onClick={() => markPaid(r.id)} className="rounded-sm px-2 py-1 text-xs font-medium text-blue-400/80 transition-colors hover:bg-blue-400/10 hover:text-blue-400" title="Marquer payé">💰 Payé</button>
                        )}
                        {r.status !== "cancelled" && r.status !== "paid" && (
                          <button onClick={() => cancelRes(r.id)} className="rounded-sm p-1.5 text-amber-400/60 transition-colors hover:bg-amber-400/10 hover:text-amber-400" title="Annuler"><XIcon className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => deleteRes(r.id)} className="rounded-sm p-1.5 text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
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
