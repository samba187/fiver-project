"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Check, X as XIcon, AlertTriangle, Shield, Edit, Eye, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Player {
  id: number;
  full_name: string;
  date_of_birth: string | null;
  category: string;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = ["U7", "U9", "U11", "U13", "U15", "U17"];
const STATUSES = [
  { value: "pending", label: "En attente", className: "bg-amber-500/10 text-amber-400" },
  { value: "active", label: "Actif", className: "bg-fiver-green/10 text-fiver-green" },
  { value: "inactive", label: "Inactif", className: "bg-white/10 text-white/40" },
  { value: "suspended", label: "Suspendu", className: "bg-red-500/10 text-red-400" },
];

function isExpired(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
function isExpiringSoon(dateStr: string | null, days = 30) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return d > new Date() && d <= soon;
}

function statusBadge(status: string) {
  const s = STATUSES.find(st => st.value === status);
  if (!s) return null;
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>;
}

const emptyPlayer = (): Omit<Player, "id" | "created_at"> => ({
  full_name: "", date_of_birth: null, category: "U13", parent_name: null, parent_phone: null,
  parent_email: null, license_number: null, license_expiry: null, status: "active", notes: null,
});

export default function AcademyManagementPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyPlayer());
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from("academy_players").select("*").order("created_at", { ascending: false });
    setPlayers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !(p.parent_phone || "").includes(search) && !(p.license_number || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, search, filterCategory, filterStatus]);

  function openAdd() {
    setEditing(null);
    setForm(emptyPlayer());
    setModalOpen(true);
  }
  function openEdit(p: Player) {
    setEditing(p);
    setForm({
      full_name: p.full_name, date_of_birth: p.date_of_birth, category: p.category,
      parent_name: p.parent_name, parent_phone: p.parent_phone, parent_email: p.parent_email,
      license_number: p.license_number, license_expiry: p.license_expiry,
      status: p.status, notes: p.notes,
    });
    setModalOpen(true);
  }

  async function savePlayer() {
    if (!form.full_name || !form.category) return;
    const payload = {
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      category: form.category,
      parent_name: form.parent_name || null,
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      status: form.status,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from("academy_players").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("academy_players").insert(payload);
    }
    setModalOpen(false);
    setEditing(null);
    fetchPlayers();
  }

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

  // Stats
  const totalActive = players.filter(p => p.status === "active").length;
  const expiredLicenses = players.filter(p => isExpired(p.license_expiry)).length;

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Fiveur Academy</h1>
          <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{players.length} joueur(s) inscrits</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 rounded-sm bg-fiver-green px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 sm:text-sm">
          <Plus className="h-4 w-4" /> Ajouter un joueur
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-white/30">Total</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-white">{players.length}</p>
        </div>
        <div className="rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-4">
          <p className="text-xs uppercase tracking-wide text-fiver-green/60">Actifs</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-fiver-green">{totalActive}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-red-400/60">Licences expirées</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-red-400">{expiredLicenses}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher nom, téléphone, licence..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, ...CATEGORIES.map(c => ({ key: c, label: c }))].map((f) => (
            <button key={f.key} onClick={() => setFilterCategory(f.key)} className={cn("rounded-sm px-2 py-1.5 text-xs font-medium transition-colors", filterCategory === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Tous" }, ...STATUSES.map(s => ({ key: s.value, label: s.label }))].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("rounded-sm px-2 py-1.5 text-xs font-medium transition-colors", filterStatus === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Aucun joueur trouvé.</p>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{p.full_name}</p>
                  {p.date_of_birth && <p className="text-xs text-white/30">{new Date(p.date_of_birth).toLocaleDateString("fr-FR")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-fiver-green/10 px-2 py-0.5 text-xs font-bold text-fiver-green">{p.category}</span>
                  {statusBadge(p.status)}
                </div>
              </div>
              {p.parent_phone && <p className="mb-1 text-xs text-white/40">📱 {p.parent_phone}</p>}
              {/* Alerts */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {p.license_number && (
                  <span className={cn("text-[10px] font-medium rounded-sm px-1.5 py-0.5", isExpired(p.license_expiry) ? "bg-red-500/10 text-red-400" : isExpiringSoon(p.license_expiry) ? "bg-amber-500/10 text-amber-400" : "bg-fiver-green/10 text-fiver-green")}>
                    <Shield className="inline h-2.5 w-2.5 mr-0.5" />
                    {p.license_number}
                    {isExpired(p.license_expiry) && " — Expiré"}
                    {isExpiringSoon(p.license_expiry) && " — Bientôt"}
                  </span>
                )}
                {!p.license_number && <span className="bg-white/5 text-white/30 rounded-sm px-1.5 py-0.5 text-[10px]">Pas de licence</span>}
              </div>
              <div className="flex gap-2 border-t border-white/5 pt-2">
                <button onClick={() => setViewPlayer(p)} className="text-xs text-blue-400 hover:underline">Voir</button>
                <button onClick={() => openEdit(p)} className="text-xs text-fiver-green hover:underline">Modifier</button>
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
                <th className="px-5 py-3">Joueur</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Parent / Contact</th>
                <th className="px-5 py-3">Licence</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-white/30">Aucun joueur trouvé.</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{p.full_name}</p>
                      {p.date_of_birth && <p className="text-xs text-white/30">{new Date(p.date_of_birth).toLocaleDateString("fr-FR")}</p>}
                    </td>
                    <td className="px-5 py-3.5"><span className="rounded-sm bg-fiver-green/10 px-2 py-1 text-xs font-bold text-fiver-green">{p.category}</span></td>
                    <td className="px-5 py-3.5">
                      {p.parent_name && <p className="text-sm text-white/60">{p.parent_name}</p>}
                      {p.parent_phone && <p className="text-xs text-white/30">{p.parent_phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.license_number ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white/60">{p.license_number}</span>
                          {p.license_expiry && (
                            <span className={cn("text-[10px] font-medium",
                              isExpired(p.license_expiry) ? "text-red-400" :
                              isExpiringSoon(p.license_expiry) ? "text-amber-400" : "text-fiver-green"
                            )}>
                              {isExpired(p.license_expiry) ? "⚠ Expirée" :
                               isExpiringSoon(p.license_expiry) ? "⏳ Bientôt" : "✓ Valide"} — {new Date(p.license_expiry).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      ) : (<span className="text-xs text-white/20">—</span>)}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(p.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewPlayer(p)} className="rounded-sm p-1.5 text-blue-400/60 hover:bg-blue-400/10 hover:text-blue-400" title="Voir"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(p)} className="rounded-sm p-1.5 text-fiver-green/60 hover:bg-fiver-green/10 hover:text-fiver-green" title="Modifier"><Edit className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">{editing ? "Modifier le joueur" : "Ajouter un joueur"}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Nom complet *</label>
                <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Prénom et Nom" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Date de naissance</label>
                  <input type="date" value={form.date_of_birth || ""} onChange={e => setForm({...form, date_of_birth: e.target.value || null})} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Catégorie *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-white">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Nom du parent</label>
                <input type="text" value={form.parent_name || ""} onChange={e => setForm({...form, parent_name: e.target.value || null})} placeholder="Nom du parent/tuteur" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Téléphone</label>
                  <input type="tel" value={form.parent_phone || ""} onChange={e => setForm({...form, parent_phone: e.target.value || null})} placeholder="+222 XX XX XX XX" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Email</label>
                  <input type="email" value={form.parent_email || ""} onChange={e => setForm({...form, parent_email: e.target.value || null})} placeholder="email@exemple.com" className={inputClass} />
                </div>
              </div>

              <hr className="border-white/5" />
              <p className="text-xs font-semibold uppercase tracking-wide text-white/30">Documents</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">N° Licence</label>
                  <input type="text" value={form.license_number || ""} onChange={e => setForm({...form, license_number: e.target.value || null})} placeholder="LIC-XXXX" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Expiration licence</label>
                  <input type="date" value={form.license_expiry || ""} onChange={e => setForm({...form, license_expiry: e.target.value || null})} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Statut</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm({...form, status: s.value})}
                      className={cn("rounded-sm border px-3 py-2 text-xs font-medium transition-colors",
                        form.status === s.value ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-white/10 text-white/40 hover:border-white/20"
                      )}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value || null})} placeholder="Remarques, allergies, etc." rows={2} className={inputClass} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70">Annuler</button>
              <button onClick={savePlayer} disabled={!form.full_name} className="rounded-sm bg-fiver-green px-5 py-2 text-sm font-bold text-fiver-black hover:opacity-90 disabled:opacity-50">
                {editing ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* View Player Modal */}
      {viewPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fiver-green/10 font-[var(--font-heading)] text-lg font-bold text-fiver-green">
                {viewPlayer.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-[var(--font-heading)] text-lg font-bold text-white">{viewPlayer.full_name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-fiver-green">{viewPlayer.category}</span>
                  {statusBadge(viewPlayer.status)}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              {viewPlayer.date_of_birth && (
                <div className="flex justify-between"><span className="text-white/40">Date de naissance</span><span className="text-white/70">{new Date(viewPlayer.date_of_birth).toLocaleDateString("fr-FR")}</span></div>
              )}
              {viewPlayer.parent_name && (
                <div className="flex justify-between"><span className="text-white/40">Parent</span><span className="text-white/70">{viewPlayer.parent_name}</span></div>
              )}
              {viewPlayer.parent_phone && (
                <div className="flex justify-between"><span className="text-white/40">Téléphone</span><span className="text-white/70">{viewPlayer.parent_phone}</span></div>
              )}
              {viewPlayer.parent_email && (
                <div className="flex justify-between"><span className="text-white/40">Email</span><span className="text-white/70">{viewPlayer.parent_email}</span></div>
              )}
              <hr className="border-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40">Licence</span>
                {viewPlayer.license_number ? (
                  <span className={cn("text-xs font-medium", isExpired(viewPlayer.license_expiry) ? "text-red-400" : "text-fiver-green")}>
                    {viewPlayer.license_number} {viewPlayer.license_expiry && `— ${isExpired(viewPlayer.license_expiry) ? "Expirée" : "Valide"} (${new Date(viewPlayer.license_expiry).toLocaleDateString("fr-FR")})`}
                  </span>
                ) : <span className="text-white/20">—</span>}
              </div>
              {viewPlayer.notes && (
                <><hr className="border-white/5" /><div><span className="text-xs text-white/40">Notes</span><p className="mt-1 text-xs text-white/60">{viewPlayer.notes}</p></div></>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setViewPlayer(null); openEdit(viewPlayer); }} className="rounded-sm bg-fiver-green/10 px-4 py-2 text-xs font-medium text-fiver-green hover:bg-fiver-green/20">Modifier</button>
              <button onClick={() => setViewPlayer(null)} className="rounded-sm px-4 py-2 text-xs text-white/40 hover:text-white/70">Fermer</button>
            </div>
            <button onClick={() => setViewPlayer(null)} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
