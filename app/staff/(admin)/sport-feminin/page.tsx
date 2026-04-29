"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Heart, Check, X, Phone, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Inscription {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  telephone: string;
  enfant_inscrit: boolean;
  enfant_nom_prenom?: string;
  statut: string;
  created_at: string;
}

export default function SportFemininAdminPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("tous");

  useEffect(() => {
    fetchInscriptions();
  }, []);

  async function fetchInscriptions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sport_feminin_inscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setInscriptions(data);
    setLoading(false);
  }

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from("sport_feminin_inscriptions")
      .update({ statut: newStatus })
      .eq("id", id);
    if (!error) fetchInscriptions();
  }

  async function deleteInscription(id: number) {
    if (!confirm("Voulez-vous vraiment supprimer cette inscription ?")) return;
    const { error } = await supabase
      .from("sport_feminin_inscriptions")
      .delete()
      .eq("id", id);
    if (!error) fetchInscriptions();
  }

  const filtered = inscriptions.filter((i) => {
    const matchesSearch = `${i.nom} ${i.prenom} ${i.telephone}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "tous" || i.statut === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Sport Féminin
        </h1>
        <p className="mt-1 text-sm text-white/50">Gérez les inscriptions aux séances de sport féminin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-[#c81054]/20 bg-[#c81054]/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-[#c81054]" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Inscrites</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-4xl font-bold text-[#c81054]">
            {inscriptions.length}
          </p>
        </div>
        
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-fiver-green" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">Confirmées</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-white">
            {inscriptions.filter(i => i.statut === "confirmé").length}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-yellow-500" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">En attente</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-white">
            {inscriptions.filter(i => i.statut === "en_attente").length}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">Réductions (20%)</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-emerald-400">
            {inscriptions.filter(i => i.enfant_inscrit).length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher un nom, numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
          />
        </div>
        <div className="flex items-center gap-2">
          {["tous", "en_attente", "confirmé", "annulé"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                filter === f
                  ? "bg-[#c81054] text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Nom Complet</th>
                <th className="px-6 py-4 font-semibold">Date de Naissance</th>
                <th className="px-6 py-4 font-semibold">Téléphone</th>
                <th className="px-6 py-4 font-semibold text-center">Tarif</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    Aucune inscription trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((ins) => (
                  <tr key={ins.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{ins.prenom} {ins.nom}</div>
                      <div className="text-xs text-white/40">{new Date(ins.created_at).toLocaleDateString("fr-FR")}</div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(ins.date_naissance).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-white/40" />
                        <a href={`tel:${ins.telephone}`} className="hover:text-white hover:underline">{ins.telephone}</a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {ins.enfant_inscrit ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                            800 MRU (-20%)
                          </span>
                          {ins.enfant_nom_prenom && (
                            <span className="text-[10px] text-white/50">{ins.enfant_nom_prenom}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-white/60">
                          1000 MRU
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        ins.statut === "confirmé" ? "bg-fiver-green/10 text-fiver-green border-fiver-green/20" :
                        ins.statut === "en_attente" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {ins.statut === "confirmé" && <Check className="h-3 w-3" />}
                        {ins.statut === "annulé" && <X className="h-3 w-3" />}
                        {ins.statut.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://wa.me/222${ins.telephone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                        >
                          WhatsApp
                        </a>
                        {ins.statut === "en_attente" && (
                          <button
                            onClick={() => updateStatus(ins.id, "confirmé")}
                            className="rounded-md bg-fiver-green/10 px-3 py-1.5 text-xs font-medium text-fiver-green hover:bg-fiver-green/20 transition-colors"
                          >
                            Confirmer
                          </button>
                        )}
                        {ins.statut !== "annulé" && (
                          <button
                            onClick={() => updateStatus(ins.id, "annulé")}
                            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          onClick={() => deleteInscription(ins.id)}
                          className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
