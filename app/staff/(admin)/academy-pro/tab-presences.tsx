"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { UserCheck, Search, Loader2, CalendarDays, User, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Registration } from "./page";

interface Presence {
  id: number;
  registration_id: number | null;
  badge_code: string;
  date_presence: string;
  scanned_at: string;
  statut_abonnement: string | null;
  autorise: boolean;
  scanned_by: string | null;
  note: string | null;
}

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  paye: { label: "À jour", cls: "bg-fiver-green/15 text-fiver-green" },
  partiel: { label: "Partiel", cls: "bg-amber-500/15 text-amber-400" },
  non_paye: { label: "Non payé", cls: "bg-red-500/15 text-red-400" },
  off: { label: "Mois OFF", cls: "bg-white/10 text-white/50" },
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TabPresences({ registrations, saison }: { registrations: Registration[]; saison: string }) {
  const [mode, setMode] = useState<"jour" | "enfant">("jour");
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [selectedChild, setSelectedChild] = useState<Registration | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);

  const byBadge = useMemo(() => {
    const map: Record<string, Registration> = {};
    registrations.forEach(r => { if (r.badge_code) map[r.badge_code] = r; });
    return map;
  }, [registrations]);

  const fetchJour = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_presences")
      .select("*")
      .eq("date_presence", date)
      .eq("saison", saison)
      .order("scanned_at", { ascending: false });
    setPresences((data as Presence[]) || []);
    setLoading(false);
  }, [date, saison]);

  const fetchEnfant = useCallback(async (badge: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_presences")
      .select("*")
      .eq("badge_code", badge)
      .order("date_presence", { ascending: false })
      .limit(300);
    setPresences((data as Presence[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mode === "jour") fetchJour();
  }, [mode, fetchJour]);

  useEffect(() => {
    if (mode === "enfant" && selectedChild?.badge_code) fetchEnfant(selectedChild.badge_code);
  }, [mode, selectedChild, fetchEnfant]);

  const filteredChildren = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(r => `${r.prenom} ${r.nom}`.toLowerCase().includes(q));
  }, [registrations, search]);

  const sansAbonnement = presences.filter(p => p.statut_abonnement === "non_paye").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Présences</h2>
        </div>
        <div className="flex gap-1 rounded-sm border border-white/5 bg-white/[0.02] p-1">
          <button
            onClick={() => { setMode("jour"); setSelectedChild(null); }}
            className={cn("flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "jour" ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Par jour
          </button>
          <button
            onClick={() => setMode("enfant")}
            className={cn("flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "enfant" ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}
          >
            <User className="h-3.5 w-3.5" /> Par enfant
          </button>
        </div>
      </div>

      {/* ===== MODE PAR JOUR ===== */}
      {mode === "jour" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-sm border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-fiver-green focus:outline-none"
            />
            <div className="flex items-center gap-2 rounded-sm border border-white/5 bg-white/[0.02] px-4 py-2.5">
              <span className="text-xs text-white/40">Présents</span>
              <span className="font-[var(--font-heading)] text-lg font-bold text-fiver-green">{presences.length}</span>
            </div>
            {sansAbonnement > 0 && (
              <div className="flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/5 px-4 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-red-400">{sansAbonnement} sans abonnement à jour</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>
          ) : presences.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/30">Aucun passage enregistré ce jour.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/5">
              {presences.map(p => {
                const enfant = byBadge[p.badge_code];
                const st = STATUT_LABEL[p.statut_abonnement || ""] || { label: "—", cls: "bg-white/5 text-white/40" };
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                    <span className="font-mono text-xs text-white/30">
                      {new Date(p.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">
                        {enfant ? `${enfant.prenom} ${enfant.nom}` : p.badge_code}
                      </p>
                      {enfant?.categorie_foot && <p className="text-[11px] text-white/30">{enfant.categorie_foot}</p>}
                    </div>
                    {!p.autorise && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">Refusé</span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", st.cls)}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== MODE PAR ENFANT ===== */}
      {mode === "enfant" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un enfant..."
                className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none"
              />
            </div>
            <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-white/5">
              {filteredChildren.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedChild(r)}
                  className={cn("flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left transition-colors",
                    selectedChild?.id === r.id ? "bg-fiver-green/10" : "bg-white/[0.02] hover:bg-white/5")}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-white/80">{r.prenom} {r.nom}</span>
                  {r.categorie_foot && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/40">{r.categorie_foot}</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            {!selectedChild ? (
              <p className="py-12 text-center text-sm text-white/30">Sélectionnez un enfant pour voir son historique de présence.</p>
            ) : loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>
            ) : (
              <>
                <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <p className="font-[var(--font-heading)] text-lg font-bold text-white">{selectedChild.prenom} {selectedChild.nom}</p>
                  <p className="mt-1 text-xs text-white/40">
                    <strong className="text-fiver-green">{presences.length}</strong> passage(s) enregistré(s)
                    {presences.length > 0 && ` — dernier le ${new Date(presences[0].date_presence + "T00:00:00").toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {presences.length === 0 ? (
                  <p className="py-12 text-center text-sm text-white/30">Aucun passage enregistré pour cet enfant.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-white/5">
                    {presences.map(p => {
                      const st = STATUT_LABEL[p.statut_abonnement || ""] || { label: "—", cls: "bg-white/5 text-white/40" };
                      return (
                        <div key={p.id} className="flex items-center gap-3 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                          {p.autorise ? <Check className="h-4 w-4 shrink-0 text-fiver-green" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/85 capitalize">
                              {new Date(p.date_presence + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                            <p className="text-[11px] text-white/30">
                              {new Date(p.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              {p.scanned_by ? ` — ${p.scanned_by}` : ""}
                            </p>
                          </div>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", st.cls)}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
