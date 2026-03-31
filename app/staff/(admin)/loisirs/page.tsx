"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Check, X as XIcon, AlertTriangle, Shield, Edit, Eye, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Child {
  id: number;
  full_name: string;
  date_of_birth: string | null;
  age: number | null;
  category: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  inscription_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = ["U7", "U9", "U11", "U13", "U15"];
const STATUSES = [
  { value: "active", label: "Actif", className: "bg-fiver-green/10 text-fiver-green" },
  { value: "inactive", label: "Inactif", className: "bg-white/10 text-white/40" },
  { value: "expired", label: "Expiré", className: "bg-amber-500/10 text-amber-400" },
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

const emptyChild = (): Omit<Child, "id" | "created_at"> => ({
  full_name: "", date_of_birth: null, age: null, category: "U9", parent_name: "", parent_phone: "",
  parent_email: null, license_number: null, license_expiry: null, inscription_date: new Date().toISOString().split('T')[0], status: "active", notes: null,
});

export default function LoisirsManagementPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [form, setForm] = useState(emptyChild());
  const [viewChild, setViewChild] = useState<Child | null>(null);

  const fetchChildren = useCallback(async () => {
    const { data } = await supabase.from("loisirs_children").select("*").order("created_at", { ascending: false });
    setChildren(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  const filtered = useMemo(() => {
    return children.filter(c => {
      if (filterCategory !== "all" && c.category !== filterCategory) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search && !c.full_name.toLowerCase().includes(search.toLowerCase()) && !c.parent_name.toLowerCase().includes(search.toLowerCase()) && !c.parent_phone.includes(search)) return false;
      return true;
    });
  }, [children, search, filterCategory, filterStatus]);

  function openAdd() {
    setEditing(null);
    setForm(emptyChild());
    setModalOpen(true);
  }
  function openEdit(c: Child) {
    setEditing(c);
    setForm({
      full_name: c.full_name, date_of_birth: c.date_of_birth, age: c.age, category: c.category,
      parent_name: c.parent_name, parent_phone: c.parent_phone, parent_email: c.parent_email,
      license_number: c.license_number, license_expiry: c.license_expiry,
      inscription_date: c.inscription_date, status: c.status, notes: c.notes,
    });
    setModalOpen(true);
  }

  async function saveChild() {
    if (!form.full_name || !form.category || !form.parent_name || !form.parent_phone) return;
    const payload = {
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      age: form.age || null,
      category: form.category,
      parent_name: form.parent_name,
      parent_phone: form.parent_phone,
      parent_email: form.parent_email || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      inscription_date: form.inscription_date || new Date().toISOString().split('T')[0],
      status: form.status,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from("loisirs_children").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("loisirs_children").insert(payload);
    }
    setModalOpen(false);
    setEditing(null);
    fetchChildren();
  }

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  // Stats
  const totalActive = children.filter(c => c.status === "active").length;

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>);
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Centre de Loisirs</h1>
          <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{children.length} enfant(s) inscrit(s)</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 rounded-sm bg-emerald-500 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:text-sm">
          <Plus className="h-4 w-4" /> Nouvel enfant
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-white/30">Total</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-white">{children.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-400/60">Actifs</p>
          <p className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-emerald-400">{totalActive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher enfant, parent, téléphone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, ...CATEGORIES.map(c => ({ key: c, label: c }))].map((f) => (
            <button key={f.key} onClick={() => setFilterCategory(f.key)} className={cn("rounded-sm px-2 py-1.5 text-xs font-medium transition-colors", filterCategory === f.key ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Tous" }, ...STATUSES.map(s => ({ key: s.value, label: s.label }))].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("rounded-sm px-2 py-1.5 text-xs font-medium transition-colors", filterStatus === f.key ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Children List */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Aucun enfant trouvé.</p>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{c.full_name}</p>
                  {c.age && <p className="text-xs text-white/30">{c.age} ans</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">{c.category}</span>
                  {statusBadge(c.status)}
                </div>
              </div>
              <div className="mb-2 text-xs text-white/50">
                <p>Parent: {c.parent_name}</p>
                <p>📱 {c.parent_phone}</p>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {c.license_number && (
                  <span className={cn("text-[10px] font-medium rounded-sm px-1.5 py-0.5", isExpired(c.license_expiry) ? "bg-red-500/10 text-red-400" : isExpiringSoon(c.license_expiry) ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400")}>
                    <Shield className="inline h-2.5 w-2.5 mr-0.5" /> {c.license_number}
                  </span>
                )}
              </div>
              <div className="flex gap-2 border-t border-white/5 pt-2">
                <button onClick={() => setViewChild(c)} className="text-xs text-blue-400 hover:underline">Voir</button>
                <button onClick={() => openEdit(c)} className="text-xs text-emerald-500 hover:underline">Modifier</button>
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
                <th className="px-5 py-3">Parent / Contact</th>
                <th className="px-5 py-3">Licence</th>
                <th className="px-5 py-3">Inscription</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-white/30">Aucun enfant trouvé.</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/80">{c.full_name}</p>
                      {c.age && <p className="text-xs text-white/30">{c.age} ans</p>}
                    </td>
                    <td className="px-5 py-3.5"><span className="rounded-sm bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">{c.category}</span></td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-white/60">{c.parent_name}</p>
                      <p className="text-xs text-white/30">{c.parent_phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        {c.license_number ? (
                           <span className={cn("text-[10px]", isExpired(c.license_expiry) ? "text-red-400" : "text-white/40")}>
                             Lic: {c.license_number} {isExpired(c.license_expiry) && " (Expirée)"}
                           </span>
                        ) : <span className="text-xs text-white/20">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/50">
                      {new Date(c.inscription_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(c.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewChild(c)} className="rounded-sm p-1.5 text-blue-400/60 hover:bg-blue-400/10 hover:text-blue-400" title="Voir"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(c)} className="rounded-sm p-1.5 text-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-500" title="Modifier"><Edit className="h-4 w-4" /></button>
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
            <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">{editing ? "Modifier l'enfant" : "Inscrire un enfant"}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Nom de l&apos;enfant *</label>
                <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Prénom et Nom" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Âge</label>
                  <input type="number" value={form.age || ""} onChange={e => setForm({...form, age: parseInt(e.target.value) || null})} placeholder="Ex: 10" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Catégorie *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616] text-white">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Nom du parent *</label>
                <input type="text" value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} placeholder="Nom du parent/tuteur" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Téléphone parent *</label>
                  <input type="tel" value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})} placeholder="+222 XX XX XX XX" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Email</label>
                  <input type="email" value={form.parent_email || ""} onChange={e => setForm({...form, parent_email: e.target.value || null})} placeholder="email@exemple.com" className={inputClass} />
                </div>
              </div>

              <hr className="border-white/5" />
              <p className="text-xs font-semibold uppercase tracking-wide text-white/30">Dossier</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">N° Licence</label>
                  <input type="text" value={form.license_number || ""} onChange={e => setForm({...form, license_number: e.target.value || null})} placeholder="Optionnel" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Date d&apos;inscription</label>
                  <input type="date" value={form.inscription_date} onChange={e => setForm({...form, inscription_date: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40">Statut</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm({...form, status: s.value})}
                      className={cn("rounded-sm border px-3 py-2 text-xs font-medium transition-colors",
                        form.status === s.value ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/10 text-white/40 hover:border-white/20"
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
              <button onClick={saveChild} disabled={!form.full_name || !form.parent_name || !form.parent_phone} className="rounded-sm bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                {editing ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* View Child Modal */}
      {viewChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 font-[var(--font-heading)] text-lg font-bold text-emerald-400">
                {viewChild.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-[var(--font-heading)] text-lg font-bold text-white">{viewChild.full_name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">{viewChild.category}</span>
                  {statusBadge(viewChild.status)}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-white/40">Inscription</span><span className="text-white/70">{new Date(viewChild.inscription_date).toLocaleDateString("fr-FR")}</span></div>
              {viewChild.age && <div className="flex justify-between"><span className="text-white/40">Âge</span><span className="text-white/70">{viewChild.age} ans</span></div>}
              {viewChild.date_of_birth && <div className="flex justify-between"><span className="text-white/40">Date de naissance</span><span className="text-white/70">{new Date(viewChild.date_of_birth).toLocaleDateString("fr-FR")}</span></div>}
              
              <hr className="border-white/5" />
              <div className="flex justify-between"><span className="text-white/40">Parent</span><span className="text-white/70">{viewChild.parent_name}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Téléphone</span><span className="text-white/70">{viewChild.parent_phone}</span></div>
              {viewChild.parent_email && <div className="flex justify-between"><span className="text-white/40">Email</span><span className="text-white/70">{viewChild.parent_email}</span></div>}
              
              <hr className="border-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40">Licence</span>
                {viewChild.license_number ? (
                  <span className={cn("text-xs font-medium", isExpired(viewChild.license_expiry) ? "text-red-400" : "text-white/70")}>
                    {viewChild.license_number} {viewChild.license_expiry && `— ${isExpired(viewChild.license_expiry) ? "Expirée" : "Valide"} (${new Date(viewChild.license_expiry).toLocaleDateString("fr-FR")})`}
                  </span>
                ) : <span className="text-white/20">—</span>}
              </div>
              
              {viewChild.notes && (
                <><hr className="border-white/5" /><div><span className="text-xs text-white/40">Notes</span><p className="mt-1 text-xs text-white/60">{viewChild.notes}</p></div></>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setViewChild(null); openEdit(viewChild); }} className="rounded-sm bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20">Modifier</button>
              <button onClick={() => setViewChild(null)} className="rounded-sm px-4 py-2 text-xs text-white/40 hover:text-white/70">Fermer</button>
            </div>
            <button onClick={() => setViewChild(null)} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
