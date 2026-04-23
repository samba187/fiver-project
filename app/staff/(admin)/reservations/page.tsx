"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Check, X as XIcon, Trash2, DollarSign, Smartphone, CreditCard, MessageCircle, Banknote, Eye, Calendar, Clock, MapPin, User, Receipt } from "lucide-react";
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
  payment_receiver?: string;
  payment_method?: string;
  payment_confirmed?: boolean;
  amount_paid?: number;
  total_price?: number;
  deposit_amount?: number;
  cancellation_reason?: string;
  created_at: string;
  email?: string;
  is_recurring?: boolean;
  recurrence_group?: string;
  user_id?: string;
}

const PAYMENT_METHODS_MAP: Record<string, { label: string; icon: typeof Smartphone; className: string }> = {
  bankily: { label: "Bankily", icon: Smartphone, className: "bg-yellow-500/10 text-yellow-400" },
  masrvi: { label: "Masrvi", icon: CreditCard, className: "bg-purple-500/10 text-purple-400" },
  especes: { label: "Espèces", icon: Banknote, className: "bg-green-500/10 text-green-400" },
};

const TIME_OPTIONS = [
  "10h-11h", "11h-12h", "12h-13h", "13h-14h", "14h-15h", "15h-16h",
  "16h-17h", "17h-18h", "18h-19h", "19h-20h", "20h-21h", "21h-22h",
  "22h-23h", "23h-00h", "00h-01h", "01h-02h", "02h-03h"
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [newRes, setNewRes] = useState({ name: "", phone: "", email: "", date: "", time: TIME_OPTIONS[0], pitch: "Terrain 1" });

  // Modals state
  const [payModal, setPayModal] = useState<{ isOpen: boolean; id: number | null; totalPrice: number; amountPaid: number }>({ isOpen: false, id: null, totalPrice: 0, amountPaid: 0 });
  const [payReceiver, setPayReceiver] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [cancelReason, setCancelReason] = useState("");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [deleteReason, setDeleteReason] = useState("");

  // Detail modal
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; res: Reservation | null }>({ isOpen: false, res: null });
  function openDetail(res: Reservation) { setDetailModal({ isOpen: true, res }); }
  function closeDetail() { setDetailModal({ isOpen: false, res: null }); }

  const fetchReservations = useCallback(async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    setReservations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  async function submitPayment() {
    if (payModal.id && payReceiver.trim()) {
      const amount = parseInt(payAmount) || payModal.totalPrice;
      const newStatus = amount >= payModal.totalPrice ? "paid" : "pending";
      await supabase.from("reservations").update({ status: newStatus, payment_receiver: payReceiver, amount_paid: amount, payment_confirmed: amount >= payModal.totalPrice }).eq("id", payModal.id);
      setPayModal({ isOpen: false, id: null, totalPrice: 0, amountPaid: 0 });
      setPayReceiver("");
      setPayAmount("");
      fetchReservations();
    }
  }

  async function cancelRecurrenceSeries(recurrenceGroup: string) {
    if (!confirm("Annuler TOUTE la série récurrente ? Cette action est irréversible.")) return;
    await supabase.from("reservations").update({ status: "cancelled", cancellation_reason: "Série annulée par l'admin" }).eq("recurrence_group", recurrenceGroup);
    fetchReservations();
  }

  async function submitCancel() {
    if (cancelModal.id) {
      await supabase.from("reservations").update({ status: "cancelled", cancellation_reason: cancelReason }).eq("id", cancelModal.id);
      setCancelModal({ isOpen: false, id: null });
      setCancelReason("");
      fetchReservations();
    }
  }

  async function submitDelete() {
    if (deleteModal.id) {
      await supabase.from("reservations").update({ status: "deleted", cancellation_reason: deleteReason }).eq("id", deleteModal.id);
      setDeleteModal({ isOpen: false, id: null });
      setDeleteReason("");
      fetchReservations();
    }
  }

  async function addReservation() {
    if (!newRes.name || !newRes.phone || !newRes.date) return;
    await supabase.from("reservations").insert({
      name: newRes.name, phone: newRes.phone, email: newRes.email, date: newRes.date,
      time: newRes.time, pitch: newRes.pitch, status: "pending",
    });
    const { data: existing } = await supabase.from("clients").select("id, total_bookings").eq("phone", newRes.phone).single();
    if (existing) {
      await supabase.from("clients").update({ total_bookings: existing.total_bookings + 1, last_booking: newRes.date, name: newRes.name }).eq("id", existing.id);
    } else {
    }
    setNewRes({ name: "", phone: "", email: "", date: "", time: TIME_OPTIONS[0], pitch: "Terrain 1" });
    setShowAdd(false);
    fetchReservations();
  }

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filterStatus === "recurring") return r.is_recurring === true;
      else if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.phone.includes(search)) return false;
      return true;
    });
  }, [reservations, search, filterStatus]);

  const statusBadge = (status: string, r?: Reservation) => {
    const totalPrice = r?.total_price || 0;
    const amountPaid = r?.amount_paid || 0;
    switch (status) {
      case "paid": return <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">✅ Payée ({amountPaid.toLocaleString()} MRU)</span>;
      case "pending": {
        if (amountPaid > 0 && amountPaid < totalPrice) {
          return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">⚠️ Acompte ({amountPaid.toLocaleString()}/{totalPrice.toLocaleString()})</span>;
        }
        return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">⏳ En attente</span>;
      }
      case "cancelled": return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">❌ Annulée</span>;
      default: return null;
    }
  };

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

  const getWhatsAppLink = (r: Reservation) => {
    const formattedPhone = r.phone.replace(/\s+/g, "").startsWith("+") ? r.phone.replace(/\s+/g, "").slice(1) : r.phone.replace(/\s+/g, "").startsWith("222") ? r.phone.replace(/\s+/g, "") : `222${r.phone.replace(/\s+/g, "")}`;
    const text = `*FIVEUR ARENA*\n\nBonjour ${r.name},\nVotre demande de réservation pour le *${r.pitch}* le *${new Date(r.date).toLocaleDateString("fr-FR")}* à *${r.time}* a bien été reçue.\n\n⚠️ Veuillez payer la somme de *${r.total_price || 0} MRU* via *Bankily* ou *Masrvi* au numéro 48 81 38 22.\n\n👉 *Merci de répondre à ce message avec la capture d'écran du paiement pour confirmer votre créneau.*`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Réservations</h1>
          <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{reservations.length} réservation(s)</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center justify-center gap-2 rounded-sm bg-fiver-green px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 sm:text-sm">
          <Plus className="h-4 w-4" /> Nouvelle
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="mb-4 animate-step rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-4 sm:mb-6 sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fiver-green sm:mb-4 sm:text-sm">Ajouter une réservation</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="text" placeholder="Nom complet" value={newRes.name} onChange={(e) => setNewRes({ ...newRes, name: e.target.value })} className={inputClass} />
            <input type="tel" placeholder="+222 XX XX XX XX" value={newRes.phone} onChange={(e) => setNewRes({ ...newRes, phone: e.target.value })} className={inputClass} />
            <input type="date" value={newRes.date} onChange={(e) => setNewRes({ ...newRes, date: e.target.value })} className={inputClass} />
            <select value={newRes.time} onChange={(e) => setNewRes({ ...newRes, time: e.target.value })} className={inputClass}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t} className="bg-fiver-black text-white">{t}</option>)}
            </select>
            <select value={newRes.pitch} onChange={(e) => setNewRes({ ...newRes, pitch: e.target.value })} className={inputClass}>
              <option value="Terrain 1" className="bg-fiver-black text-white">Terrain 1</option>
              <option value="Terrain 2" className="bg-fiver-black text-white">Terrain 2</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-4">
            <button onClick={addReservation} className="rounded-sm bg-fiver-green px-4 py-2 text-xs font-semibold text-fiver-black hover:opacity-90 sm:text-sm">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="rounded-sm px-4 py-2 text-xs text-white/40 hover:text-white/70 sm:text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Toutes" }, { key: "pending", label: "En attente" }, { key: "paid", label: "Payées" }, { key: "cancelled", label: "Annulées" }, { key: "recurring", label: "🔁 Récurrentes" }].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors", filterStatus === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Aucune réservation trouvée.</p>
        ) : (
          filtered.map((r) => {
            const pm = r.payment_method ? PAYMENT_METHODS_MAP[r.payment_method] : null;
            const totalPrice = r.total_price || 0;
            const amountPaid = r.amount_paid || 0;
            return (
              <div key={r.id} onClick={() => openDetail(r)} className="cursor-pointer rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-fiver-green/20 hover:bg-white/[0.04] active:scale-[0.98]">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">{r.name}</p>
                    <p className="text-xs text-white/30">{r.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status, r)}
                    <Eye className="h-3.5 w-3.5 text-white/20" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                  <span>📅 {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  <span>🕐 {r.time}</span>
                  <span>⚽ {r.pitch}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {pm ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.className)}>
                      <pm.icon className="h-3 w-3" />{pm.label}
                    </span>
                  ) : <span className="text-xs text-white/30">—</span>}
                  {totalPrice > 0 && <span className="text-xs text-white/40">{amountPaid.toLocaleString()} / {totalPrice.toLocaleString()} MRU</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-white/5 bg-white/[0.02] md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Créneau</th>
                <th className="px-5 py-3">Terrain</th>
                <th className="px-5 py-3">Paiement</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-white/30">Aucune réservation trouvée.</td></tr>
              ) : (
                filtered.map((r) => {
                  const pm = r.payment_method ? PAYMENT_METHODS_MAP[r.payment_method] : null;
                  const totalPrice = r.total_price || 0;
                  const amountPaid = r.amount_paid || 0;
                  return (
                    <tr key={r.id} onClick={() => openDetail(r)} className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white/80">{r.name}</p>
                        <p className="text-xs text-white/30">{r.phone}</p>
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 rounded-[3px] bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/80 border border-white/5">
                            📅 Réservé le {new Date(r.created_at).toLocaleDateString("fr-FR")} à {new Date(r.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{r.time}</td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{r.pitch}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {pm ? (
                            <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.className)}>
                              <pm.icon className="h-3 w-3" />{pm.label}
                            </span>
                          ) : <span className="text-xs text-white/30">—</span>}
                          {totalPrice > 0 && <span className="text-[10px] text-white/40">{amountPaid.toLocaleString()} / {totalPrice.toLocaleString()} MRU</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {statusBadge(r.status, r)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Eye className="inline-block h-4 w-4 text-white/20" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {payModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl relative">
            <h3 className="mb-2 font-[var(--font-heading)] text-lg font-bold text-white uppercase tracking-wide">Encaissement</h3>
            <p className="mb-3 text-sm text-white/50">Validez le montant reçu et enregistrez votre nom.</p>
            {payModal.totalPrice > 0 && (
              <div className="mb-4 rounded-sm bg-white/5 px-3 py-2 text-xs text-white/50">
                Total : <span className="font-medium text-fiver-green">{payModal.totalPrice.toLocaleString()} MRU</span>
                {payModal.amountPaid > 0 && <> · Déjà payé : <span className="font-medium text-yellow-400">{payModal.amountPaid.toLocaleString()} MRU</span></>}
              </div>
            )}
            <input
              type="text"
              placeholder="Nom de l'encaisseur (ex: Amadou)"
              value={payReceiver}
              onChange={(e) => setPayReceiver(e.target.value)}
              className="mb-3 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
              autoFocus
            />
            <input
              type="number"
              placeholder={`Montant reçu (défaut: ${payModal.totalPrice.toLocaleString()} MRU)`}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
            />
            {payAmount && parseInt(payAmount) < payModal.totalPrice && (
              <p className="mb-4 text-xs text-yellow-400/80">⚠️ Paiement partiel — restera {(payModal.totalPrice - parseInt(payAmount)).toLocaleString()} MRU à percevoir.</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setPayModal({ isOpen: false, id: null, totalPrice: 0, amountPaid: 0 }); setPayReceiver(""); setPayAmount(""); }} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={submitPayment} disabled={!payReceiver.trim()} className="rounded-sm bg-blue-500 px-5 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {payAmount && parseInt(payAmount) < payModal.totalPrice ? "Encaisser l'acompte" : "Confirmer la totalité"}
              </button>
            </div>
            <button onClick={() => { setPayModal({ isOpen: false, id: null, totalPrice: 0, amountPaid: 0 }); setPayReceiver(""); setPayAmount(""); }} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl relative">
            <h3 className="mb-2 font-[var(--font-heading)] text-lg font-bold text-red-500 uppercase tracking-wide">Annuler la réservation</h3>
            <p className="mb-5 text-sm text-white/50">Souhaitez-vous ajouter une raison pour cette annulation ? (Optionnel)</p>
            <input
              type="text"
              placeholder="Ex: Le client n'est pas venu"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelModal({ isOpen: false, id: null }); setCancelReason(""); }} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={submitCancel} className="rounded-sm bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors">Annuler la résa</button>
            </div>
            <button onClick={() => { setCancelModal({ isOpen: false, id: null }); setCancelReason(""); }} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-red-500/30 bg-[#161616] p-6 shadow-2xl relative">
            <h3 className="mb-2 font-[var(--font-heading)] text-lg font-bold text-red-500 uppercase tracking-wide">Supprimer la réservation</h3>
            <p className="mb-5 text-sm text-white/50">Pour des raisons de sécurité, veuillez justifier cette suppression (erreur, doublon...).</p>
            <input
              type="text"
              placeholder="Ex: Doublon créé par erreur"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteModal({ isOpen: false, id: null }); setDeleteReason(""); }} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={submitDelete} disabled={!deleteReason.trim()} className="rounded-sm bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Supprimer</button>
            </div>
            <button onClick={() => { setDeleteModal({ isOpen: false, id: null }); setDeleteReason(""); }} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal.isOpen && detailModal.res && (() => {
        const r = detailModal.res;
        const pm = r.payment_method ? PAYMENT_METHODS_MAP[r.payment_method] : null;
        const totalPrice = r.total_price || 0;
        const amountPaid = r.amount_paid || 0;
        const remaining = totalPrice - amountPaid;
        const progressPercent = totalPrice > 0 ? Math.min((amountPaid / totalPrice) * 100, 100) : 0;
        const dateObj = new Date(r.date);
        const dayName = dateObj.toLocaleDateString("fr-FR", { weekday: "long" });
        const dateFormatted = dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md animate-in fade-in duration-200" onClick={closeDetail}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-in zoom-in-95 duration-300 rounded-xl border border-white/10 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] shadow-2xl shadow-black/50 relative overflow-hidden">
              {/* Decorative top bar */}
              <div className={cn("h-1 w-full",
                r.status === "paid" ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                r.status === "cancelled" ? "bg-gradient-to-r from-red-500 to-red-400" :
                "bg-gradient-to-r from-amber-500 to-amber-400"
              )} />

              {/* Header */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold",
                      r.status === "paid" ? "bg-blue-500/15 text-blue-400" :
                      r.status === "cancelled" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    )}>
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{r.name}</h3>
                      <p className="text-xs text-white/40">{r.phone}</p>
                      {r.email && <p className="text-xs text-fiver-green/60 italic">{r.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status, r)}
                    <button onClick={closeDetail} className="rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Created at badge */}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-[3px] bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/60 border border-white/5">
                    📅 Réservé le {new Date(r.created_at).toLocaleDateString("fr-FR")} à {new Date(r.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div className="mx-6 grid grid-cols-3 gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <Calendar className="h-4 w-4 text-white/30" />
                  <span className="text-xs font-medium text-white/70">{dateFormatted}</span>
                  <span className="text-[10px] capitalize text-white/30">{dayName}</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Clock className="h-4 w-4 text-white/30" />
                  <span className="text-xs font-medium text-white/70">{r.time}</span>
                  <span className="text-[10px] text-white/30">Créneau</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <MapPin className="h-4 w-4 text-white/30" />
                  <span className="text-xs font-medium text-white/70">{r.pitch}</span>
                  <span className="text-[10px] text-white/30">Terrain</span>
                </div>
              </div>

              {/* Payment section */}
              <div className="mx-6 mt-4 rounded-lg border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-white/30" />
                    <span className="text-xs font-medium uppercase tracking-wide text-white/40">Paiement</span>
                  </div>
                  {pm ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.className)}>
                      <pm.icon className="h-3 w-3" />{pm.label}
                    </span>
                  ) : <span className="text-xs text-white/30">—</span>}
                </div>
                {totalPrice > 0 && (
                  <>
                    {/* Progress bar */}
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500",
                          progressPercent >= 100 ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                          progressPercent > 0 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                          "bg-white/10"
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-white">{amountPaid.toLocaleString()} <span className="text-xs font-normal text-white/30">MRU</span></span>
                      <span className="text-xs text-white/40">sur {totalPrice.toLocaleString()} MRU</span>
                    </div>
                    {remaining > 0 && r.status !== "cancelled" && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-sm bg-amber-500/10 px-2.5 py-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-medium text-amber-400">Reste à payer : {remaining.toLocaleString()} MRU</span>
                      </div>
                    )}
                  </>
                )}
                {r.status === "paid" && r.payment_receiver && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400/70">
                    <User className="h-3 w-3" />
                    <span>Encaissé par <span className="font-medium text-blue-400">{r.payment_receiver}</span></span>
                  </div>
                )}
              </div>

              {/* Cancellation reason */}
              {r.status === "cancelled" && r.cancellation_reason && (
                <div className="mx-6 mt-3 flex items-start gap-2 rounded-lg border border-red-500/10 bg-red-500/5 px-4 py-3">
                  <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <div>
                    <span className="text-xs font-medium text-red-400">Raison d&apos;annulation</span>
                    <p className="mt-0.5 text-xs text-red-400/70">{r.cancellation_reason}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 px-6 pt-5 pb-6">
                {r.status === "pending" && (
                  <button onClick={(e) => { e.stopPropagation(); closeDetail(); setPayModal({ isOpen: true, id: r.id, totalPrice: r.total_price || 0, amountPaid: r.amount_paid || 0 }); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/20">
                    <DollarSign className="h-4 w-4" /> Encaisser
                  </button>
                )}
                {r.status === "pending" && (
                  <a href={getWhatsAppLink(r)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366]/10 px-4 py-2.5 text-xs font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {r.status !== "cancelled" && r.status !== "paid" && (
                  <button onClick={(e) => { e.stopPropagation(); closeDetail(); setCancelModal({ isOpen: true, id: r.id }); }} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20">
                    <XIcon className="h-4 w-4" /> Annuler
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); closeDetail(); setDeleteModal({ isOpen: true, id: r.id }); }} className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
                {(r.status === "cancelled" || r.status === "paid") && (
                  <button onClick={closeDetail} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/50 transition-colors hover:bg-white/5 hover:text-white/70">
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
