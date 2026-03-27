"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Check, X as XIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Inscription {
  id: number;
  child_name: string;
  child_age: number | null;
  category: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  status: string;
  created_at: string;
}

export default function InscriptionsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchInscriptions = useCallback(async () => {
    const { data } = await supabase.from("inscriptions").select("*").order("created_at", { ascending: false });
    setInscriptions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInscriptions(); }, [fetchInscriptions]);

  async function confirmInscription(id: number) {
    await supabase.from("inscriptions").update({ status: "confirmed" }).eq("id", id);
    fetchInscriptions();
  }
  async function rejectInscription(id: number) {
    await supabase.from("inscriptions").update({ status: "rejected" }).eq("id", id);
    fetchInscriptions();
  }
  async function deleteInscription(id: number) {
    await supabase.from("inscriptions").delete().eq("id", id);
    fetchInscriptions();
  }

  const filtered = useMemo(() => {
    return inscriptions.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterCategory !== "all" && i.category !== filterCategory) return false;
      if (search && !i.child_name.toLowerCase().includes(search.toLowerCase()) && !i.parent_name.toLowerCase().includes(search.toLowerCase()) && !i.parent_phone.includes(search)) return false;
      return true;
    });
  }, [inscriptions, search, filterStatus, filterCategory]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <span className="rounded-full bg-fiver-green/10 px-2 py-0.5 text-xs font-medium text-fiver-green">Confirmée</span>;
      case "pending": return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">En attente</span>;
      case "rejected": return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Refusée</span>;
      default: return null;
    }
  };

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Inscriptions Centre de Loisirs</h1>
        <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{inscriptions.length} inscription(s)</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, { key: "pending", label: "Attente" }, { key: "confirmed", label: "Confirm." }, { key: "rejected", label: "Refusées" }].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors", filterStatus === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, { key: "U9", label: "U9" }, { key: "U12", label: "U12" }, { key: "U13", label: "U13" }, { key: "U15", label: "U15" }].map((f) => (
            <button key={f.key} onClick={() => setFilterCategory(f.key)} className={cn("rounded-sm px-2 py-1.5 text-xs font-medium transition-colors", filterCategory === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Aucune inscription trouvée.</p>
        ) : (
          filtered.map((i) => (
            <div key={i.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{i.child_name}</p>
                  {i.child_age && <p className="text-xs text-white/30">{i.child_age} ans</p>}
                </div>
                <span className="rounded-sm bg-fiver-green/10 px-2 py-0.5 text-xs font-bold text-fiver-green">{i.category}</span>
              </div>
              <div className="mb-2 text-xs text-white/50">
                <p>Parent: {i.parent_name}</p>
                <p>📱 {i.parent_phone}</p>
                {i.parent_email && <p>📧 {i.parent_email}</p>}
              </div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-white/30">{new Date(i.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                {statusBadge(i.status)}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                {i.status === "pending" && (
                  <button onClick={() => confirmInscription(i.id)} className="flex items-center gap-1 rounded-sm bg-fiver-green/10 px-3 py-1.5 text-xs font-medium text-fiver-green"><Check className="h-3 w-3" /> Confirmer</button>
                )}
                {i.status !== "rejected" && (
                  <button onClick={() => rejectInscription(i.id)} className="flex items-center gap-1 rounded-sm bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400"><XIcon className="h-3 w-3" /> Refuser</button>
                )}
                <button onClick={() => deleteInscription(i.id)} className="flex items-center gap-1 rounded-sm bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 ml-auto"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-white/5 bg-white/[0.02] md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                <th className="px-5 py-3">Enfant</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">Aucune inscription trouvée.</td></tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{i.child_name}</p>
                      {i.child_age && <p className="text-xs text-white/30">{i.child_age} ans</p>}
                    </td>
                    <td className="px-5 py-3.5"><span className="rounded-sm bg-fiver-green/10 px-2 py-1 text-xs font-bold text-fiver-green">{i.category}</span></td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-white/60">{i.parent_name}</p>
                      <p className="text-xs text-white/30">{i.parent_phone}</p>
                      {i.parent_email && <p className="text-xs text-white/30">{i.parent_email}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/60">{new Date(i.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</td>
                    <td className="px-5 py-3.5">{statusBadge(i.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {i.status === "pending" && (
                          <button onClick={() => confirmInscription(i.id)} className="rounded-sm p-1.5 text-fiver-green/60 transition-colors hover:bg-fiver-green/10 hover:text-fiver-green" title="Confirmer"><Check className="h-4 w-4" /></button>
                        )}
                        {i.status !== "rejected" && (
                          <button onClick={() => rejectInscription(i.id)} className="rounded-sm p-1.5 text-amber-400/60 transition-colors hover:bg-amber-400/10 hover:text-amber-400" title="Refuser"><XIcon className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => deleteInscription(i.id)} className="rounded-sm p-1.5 text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
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
