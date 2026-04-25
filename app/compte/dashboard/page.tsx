"use client";

import { useState, useEffect, useMemo } from "react";
import { CalendarCheck, Clock, MapPin, MessageCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Reservation {
  id: number;
  date: string;
  time: string;
  pitch: string;
  status: string;
  total_price: number;
  amount_paid: number;
  deposit_amount: number;
  payment_method: string | null;
  is_recurring: boolean;
  created_at: string;
}

type Filter = "upcoming" | "past" | "cancelled";

export default function ClientDashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("upcoming");

  useEffect(() => {
    async function fetchReservations() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", userData.user.id)
        .neq("status", "deleted")
        .order("date", { ascending: false });

      setReservations(data || []);
      setLoading(false);
    }
    fetchReservations();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filter === "upcoming") return r.date >= today && r.status !== "cancelled";
      if (filter === "past") return r.date < today && r.status !== "cancelled";
      if (filter === "cancelled") return r.status === "cancelled";
      return true;
    });
  }, [reservations, filter, today]);

  const totalDue = useMemo(() => {
    return reservations
      .filter(r => r.status !== "cancelled" && r.date >= today)
      .reduce((sum, r) => sum + (r.total_price - r.amount_paid), 0);
  }, [reservations, today]);

  function getStatusBadge(r: Reservation) {
    if (r.status === "cancelled") return { text: "Annulée", cls: "bg-red-500/10 text-red-400 border-red-500/20" };
    if (r.status === "paid" || r.amount_paid >= r.total_price) return { text: "Payé", cls: "bg-green-500/10 text-green-400 border-green-500/20" };
    if (r.amount_paid > 0) return { text: `Acompte ${r.amount_paid.toLocaleString()} MRU`, cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    if (r.status === "confirmed") return { text: "Confirmé", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    return { text: "En attente", cls: "bg-white/5 text-white/50 border-white/10" };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
            Mes Réservations
          </h1>
          <p className="mt-1 text-sm text-white/40">{reservations.length} réservation(s) au total</p>
        </div>
        <Link href="/#booking" className="inline-flex items-center justify-center gap-2 rounded-sm bg-fiver-green px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 shadow-[0_0_15px_rgba(80,200,120,0.2)]">
          <CalendarCheck className="h-4 w-4" /> Réserver un terrain
        </Link>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/30">À venir</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-fiver-green">
            {reservations.filter(r => r.date >= today && r.status !== "cancelled").length}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/30">Passées</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-white/60">
            {reservations.filter(r => r.date < today && r.status !== "cancelled").length}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/30">Reste à payer</p>
          <p className={cn("mt-1 font-[var(--font-heading)] text-2xl font-bold", totalDue > 0 ? "text-yellow-400" : "text-fiver-green")}>
            {totalDue > 0 ? `${totalDue.toLocaleString()} MRU` : "0 MRU"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {([
          { key: "upcoming" as Filter, label: "À venir" },
          { key: "past" as Filter, label: "Passées" },
          { key: "cancelled" as Filter, label: "Annulées" },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
              filter === f.key ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40 hover:text-white/60"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Reservations list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarCheck className="mx-auto h-12 w-12 text-white/10 mb-4" />
          <p className="text-sm text-white/30">Aucune réservation {filter === "upcoming" ? "à venir" : filter === "past" ? "passée" : "annulée"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const badge = getStatusBadge(r);
            const resteDu = r.total_price - r.amount_paid;
            const progressPct = r.total_price > 0 ? Math.min(100, (r.amount_paid / r.total_price) * 100) : 0;

            return (
              <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", badge.cls)}>
                        {badge.text}
                      </span>
                      {r.is_recurring && (
                        <span className="inline-flex rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-400">
                          Récurrente
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
                      <span className="flex items-center gap-1.5">
                        <CalendarCheck className="h-3.5 w-3.5 text-white/30" />
                        {new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-white/30" />
                        {r.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-white/30" />
                        {r.pitch}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-[var(--font-heading)] text-lg font-bold text-white">{r.total_price.toLocaleString()} MRU</p>
                    {resteDu > 0 && r.status !== "cancelled" && (
                      <p className="text-[10px] text-yellow-400/80">Reste : {resteDu.toLocaleString()} MRU</p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {r.status !== "cancelled" && r.total_price > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                      <span>Payé : {r.amount_paid.toLocaleString()} MRU</span>
                      <span>{Math.round(progressPct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", progressPct >= 100 ? "bg-fiver-green" : progressPct > 0 ? "bg-yellow-400" : "bg-white/10")}
                        style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}

                {/* WhatsApp payment CTA */}
                {resteDu > 0 && r.status !== "cancelled" && r.date >= today && (
                  <a href={`https://wa.me/22248869279?text=${encodeURIComponent(`Bonjour, je souhaite envoyer mon paiement pour la réservation du ${new Date(r.date).toLocaleDateString("fr-FR")} à ${r.time} (${r.pitch}). Montant : ${resteDu.toLocaleString()} MRU.`)}`}
                    target="_blank" rel="noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-sm bg-[#25D366]/10 border border-[#25D366]/20 px-3 py-2 text-[11px] font-semibold uppercase text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> Envoyer le paiement via WhatsApp
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
