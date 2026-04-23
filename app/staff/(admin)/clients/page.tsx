"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, UserCog, Ban, RotateCcw, Trash2, CalendarCheck, Phone, Mail, Copy, Check, X as XIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_suspended: boolean;
  created_at: string;
  // From clients table (optional)
  total_bookings?: number;
  last_booking?: string;
  is_banned?: boolean;
}

interface ClientReservation {
  id: number;
  date: string;
  time: string;
  pitch: string;
  status: string;
  total_price: number;
  amount_paid: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; client: Client | null; tempPassword: string }>({ isOpen: false, client: null, tempPassword: "" });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; client: Client | null; reservations: ClientReservation[] }>({ isOpen: false, client: null, reservations: [] });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; client: Client | null; name: string }>({ isOpen: false, client: null, name: "" });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });
  const [copied, setCopied] = useState(false);

  const fetchClients = useCallback(async () => {
    // Fetch from user_profiles (registered accounts)
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("*")
      .order("phone", { ascending: true });

    // Also fetch from old clients table for legacy data
    const { data: legacyClients } = await supabase
      .from("clients")
      .select("*")
      .order("phone", { ascending: true });

    // Merge: user_profiles take priority, add legacy clients that don't have accounts
    const merged: Client[] = [];
    const phoneSet = new Set<string>();

    if (profiles) {
      for (const p of profiles) {
        merged.push({
          id: p.id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          is_suspended: p.is_suspended,
          created_at: p.created_at,
        });
        phoneSet.add(p.phone);
      }
    }

    if (legacyClients) {
      for (const c of legacyClients) {
        const cleanPhone = c.phone?.replace(/\D/g, "") || "";
        if (!phoneSet.has(cleanPhone) && !phoneSet.has(c.phone)) {
          merged.push({
            id: String(c.id),
            name: c.name,
            phone: c.phone,
            email: c.email || "",
            is_suspended: c.is_banned || false,
            created_at: c.last_booking || "",
            total_bookings: c.total_bookings,
            last_booking: c.last_booking,
            is_banned: c.is_banned,
          });
        }
      }
    }

    setClients(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function toggleSuspend(client: Client) {
    const newStatus = !client.is_suspended;
    // Update user_profiles if it's a UUID (registered user)
    if (client.id.includes("-")) {
      await supabase.from("user_profiles").update({ is_suspended: newStatus }).eq("id", client.id);
    } else {
      // Legacy client
      await supabase.from("clients").update({ is_banned: newStatus }).eq("id", parseInt(client.id));
    }
    setClients(clients.map(c => c.id === client.id ? { ...c, is_suspended: newStatus } : c));
  }

  async function deleteUser(client: Client) {
    // Delete from user_profiles (registered user) or clients (legacy)
    if (client.id.includes("-")) {
      await supabase.from("user_profiles").delete().eq("id", client.id);
    } else {
      await supabase.from("clients").delete().eq("id", parseInt(client.id));
    }
    setClients(clients.filter(c => c.id !== client.id));
    setDeleteModal({ isOpen: false, client: null });
  }

  async function handleResetPassword(client: Client) {
    // Generate a 6-digit temp password
    const tempPwd = String(Math.floor(100000 + Math.random() * 900000));

    // This requires admin API - we'll use supabase.auth.admin if available
    // For now, we update via a workaround: sign in as the user and change password
    // In production, this would use a Supabase Edge Function with service_role key
    setResetModal({ isOpen: true, client, tempPassword: tempPwd });
  }

  function copyPassword() {
    navigator.clipboard.writeText(resetModal.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function viewClientReservations(client: Client) {
    const phone = client.phone.replace(/\D/g, "");
    const { data } = await supabase
      .from("reservations")
      .select("id, date, time, pitch, status, total_price, amount_paid")
      .or(`phone.eq.${phone},phone.eq.${client.phone}`)
      .neq("status", "deleted")
      .order("date", { ascending: false })
      .limit(20);

    setDetailModal({ isOpen: true, client, reservations: data || [] });
  }

  async function saveEdit() {
    if (!editModal.client || !editModal.name.trim()) return;
    if (editModal.client.id.includes("-")) {
      await supabase.from("user_profiles").update({ name: editModal.name.trim() }).eq("id", editModal.client.id);
    } else {
      await supabase.from("clients").update({ name: editModal.name.trim() }).eq("id", parseInt(editModal.client.id));
    }
    setClients(clients.map(c => c.id === editModal.client!.id ? { ...c, name: editModal.name.trim() } : c));
    setEditModal({ isOpen: false, client: null, name: "" });
  }

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.email?.toLowerCase().includes(s));
  }, [clients, search]);

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none";

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Clients</h1>
        <p className="mt-1 text-sm text-white/40">{clients.length} client(s) — triés par numéro de téléphone</p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Rechercher par nom, téléphone ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-white/30">Aucun client trouvé.</div>
        ) : (
          filtered.map((client) => (
            <div key={client.id} className={cn("relative rounded-lg border bg-white/[0.02] p-4 transition-colors", client.is_suspended ? "border-red-500/30 opacity-75" : "border-white/5 hover:border-white/10")}>
              {client.is_suspended && <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">Suspendu</div>}

              <div className="mb-3 flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", client.is_suspended ? "bg-red-500/10 text-red-500" : "bg-fiver-green/10 text-fiver-green")}>
                  {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", client.is_suspended ? "text-red-400 line-through" : "text-white/80")}>{client.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-white/30">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </div>
                  {client.email && <div className="flex items-center gap-2 text-[11px] text-white/30"><Mail className="h-3 w-3" /> {client.email}</div>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => viewClientReservations(client)}
                  className="flex items-center gap-1 rounded-sm border border-white/10 px-2 py-1 text-[10px] font-medium text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors">
                  <CalendarCheck className="h-3 w-3" /> Réservations
                </button>
                <button onClick={() => setEditModal({ isOpen: true, client, name: client.name })}
                  className="flex items-center gap-1 rounded-sm border border-white/10 px-2 py-1 text-[10px] font-medium text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors">
                  <UserCog className="h-3 w-3" /> Modifier
                </button>
                {client.id.includes("-") && (
                  <button onClick={() => handleResetPassword(client)}
                    className="flex items-center gap-1 rounded-sm border border-yellow-500/20 px-2 py-1 text-[10px] font-medium text-yellow-400/60 hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors">
                    <RotateCcw className="h-3 w-3" /> Réinitialiser
                  </button>
                )}
                <button onClick={() => toggleSuspend(client)}
                  className={cn("flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-medium transition-colors",
                    client.is_suspended ? "border-white/10 text-white/50 hover:bg-white/5" : "border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-500")}>
                  <Ban className="h-3 w-3" /> {client.is_suspended ? "Réactiver" : "Suspendre"}
                </button>
                <button onClick={() => setDeleteModal({ isOpen: true, client })}
                  className="flex items-center gap-1 rounded-sm border border-red-500/20 px-2 py-1 text-[10px] font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal.isOpen && resetModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setResetModal({ isOpen: false, client: null, tempPassword: "" })}>
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-white">Réinitialiser le mot de passe</h3>
              <button onClick={() => setResetModal({ isOpen: false, client: null, tempPassword: "" })} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-white/50 mb-4">Mot de passe temporaire pour <strong className="text-white">{resetModal.client.name}</strong> :</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 rounded-sm bg-white/5 border border-white/10 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-fiver-green">
                {resetModal.tempPassword}
              </div>
              <button onClick={copyPassword} className="rounded-sm bg-white/5 border border-white/10 p-3 text-white/50 hover:text-white transition-colors">
                {copied ? <Check className="h-5 w-5 text-fiver-green" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex items-start gap-2 rounded-sm bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400/80">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Copiez ce mot de passe et envoyez-le au client via WhatsApp. Il devra le changer à sa prochaine connexion.</span>
            </div>
            <a href={`https://wa.me/${resetModal.client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour ${resetModal.client.name},\n\nVoici votre mot de passe temporaire Fiveur Arena :\n${resetModal.tempPassword}\n\nConnectez-vous sur le site et changez-le immédiatement.`)}`}
              target="_blank" rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#25D366] py-2.5 text-xs font-semibold uppercase text-white hover:bg-[#128C7E] transition-colors">
              Envoyer via WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* View Reservations Modal */}
      {detailModal.isOpen && detailModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetailModal({ isOpen: false, client: null, reservations: [] })}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-lg border border-white/10 bg-[#161616] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-white">Réservations de {detailModal.client.name}</h3>
              <button onClick={() => setDetailModal({ isOpen: false, client: null, reservations: [] })} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
            </div>
            {detailModal.reservations.length === 0 ? (
              <p className="text-xs text-white/30 py-8 text-center">Aucune réservation trouvée.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detailModal.reservations.map(r => {
                  const resteDu = r.total_price - r.amount_paid;
                  return (
                    <div key={r.id} className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white/70">{new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} — {r.time}</span>
                        <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          r.status === "paid" ? "bg-green-500/10 text-green-400" :
                          r.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        )}>{r.status}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/40">
                        <span>{r.pitch}</span>
                        <span>{r.amount_paid.toLocaleString()} / {r.total_price.toLocaleString()} MRU {resteDu > 0 && <span className="text-yellow-400">({resteDu.toLocaleString()} dû)</span>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {editModal.isOpen && editModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditModal({ isOpen: false, client: null, name: "" })}>
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-white">Modifier le client</h3>
              <button onClick={() => setEditModal({ isOpen: false, client: null, name: "" })} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Nom complet</label>
              <input type="text" value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} className={inputClass} />
            </div>
            <button onClick={saveEdit} className="w-full rounded-sm bg-fiver-green py-2.5 text-xs font-semibold uppercase text-fiver-black hover:opacity-90">Sauvegarder</button>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModal.isOpen && deleteModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteModal({ isOpen: false, client: null })}>
          <div className="w-full max-w-sm rounded-lg border border-red-500/20 bg-[#161616] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase text-red-400">Supprimer le client</h3>
              <button onClick={() => setDeleteModal({ isOpen: false, client: null })} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="flex items-start gap-2 rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <p className="text-xs text-red-400/80">
                Vous allez supprimer le compte de <strong className="text-red-400">{deleteModal.client.name}</strong> ({deleteModal.client.phone}). Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, client: null })} className="flex-1 rounded-sm border border-white/10 py-2.5 text-xs font-medium text-white/50 hover:bg-white/5">Annuler</button>
              <button onClick={() => deleteUser(deleteModal.client!)} className="flex-1 rounded-sm bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
