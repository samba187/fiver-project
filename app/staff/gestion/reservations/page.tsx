"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Check, X as XIcon, DollarSign, CreditCard, Banknote, Smartphone } from "lucide-react";
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
  cancellation_reason?: string;
}

const TIME_OPTIONS = [
  "10h-11h", "11h-12h", "12h-13h", "13h-14h", "14h-15h", "15h-16h",
  "16h-17h", "17h-18h", "18h-19h", "19h-20h", "20h-21h", "21h-22h",
  "22h-23h", "23h-00h", "00h-01h", "01h-02h", "02h-03h"
];

const PAYMENT_METHODS = [
  { value: "bankily", label: "Bankily", icon: Smartphone, color: "text-yellow-400" },
  { value: "masrvi", label: "Masrvi", icon: CreditCard, color: "text-purple-400" },
  { value: "especes", label: "Espèces", icon: Banknote, color: "text-green-400" },
];

function paymentMethodLabel(method?: string) {
  const pm = PAYMENT_METHODS.find(p => p.value === method);
  return pm ? pm.label : "—";
}

function PaymentMethodBadge({ method }: { method?: string }) {
  const pm = PAYMENT_METHODS.find(p => p.value === method);
  if (!pm) return <span className="text-xs text-white/30">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", 
      method === "bankily" ? "bg-yellow-500/10 text-yellow-400" :
      method === "masrvi" ? "bg-purple-500/10 text-purple-400" :
      "bg-green-500/10 text-green-400"
    )}>
      <pm.icon className="h-3 w-3" />
      {pm.label}
    </span>
  );
}

export default function GestionReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newRes, setNewRes] = useState({ name: "", phone: "", date: "", time: TIME_OPTIONS[0], pitch: "Terrain 1" });

  // Pricing
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);

  // Modals
  const [payModal, setPayModal] = useState<{ isOpen: boolean; id: number | null; res: Reservation | null }>({ isOpen: false, id: null, res: null });
  const [payReceiver, setPayReceiver] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [cancelReason, setCancelReason] = useState("");

  // Confirm payment received modal (for Bankily/Masrvi)
  const [confirmPayModal, setConfirmPayModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map(s => [s.key, s.value]));
        if (map.price_weekday) setPriceWeekday(parseInt(map.price_weekday));
        if (map.price_weekend) setPriceWeekend(parseInt(map.price_weekend));
      }
    }
    fetchSettings();
  }, []);

  const fetchReservations = useCallback(async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .neq("status", "deleted")
      .order("date", { ascending: false })
      .order("time", { ascending: true });
    setReservations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  function getPrice(date: string) {
    const d = new Date(date);
    const isWeekend = [0, 5, 6].includes(d.getDay());
    return isWeekend ? priceWeekend : priceWeekday;
  }

  async function confirmRes(id: number) {
    await supabase.from("reservations").update({ status: "confirmed" }).eq("id", id);
    fetchReservations();
  }

  async function submitPayment() {
    if (payModal.id && payReceiver.trim() && payAmount) {
      const amount = parseInt(payAmount);
      const res = payModal.res;
      const totalPrice = res?.total_price || getPrice(res?.date || "");
      const prevPaid = res?.amount_paid || 0;
      const newTotal = prevPaid + amount;
      const isPaid = newTotal >= totalPrice;

      await supabase.from("reservations").update({
        status: isPaid ? "paid" : "confirmed",
        payment_receiver: payReceiver,
        payment_method: payMethod || res?.payment_method || "especes",
        amount_paid: newTotal,
        total_price: totalPrice,
        payment_confirmed: true,
      }).eq("id", payModal.id);

      setPayModal({ isOpen: false, id: null, res: null });
      setPayReceiver("");
      setPayAmount("");
      setPayMethod("");
      fetchReservations();
    }
  }

  async function submitCancel() {
    if (cancelModal.id) {
      await supabase.from("reservations").update({ status: "cancelled", cancellation_reason: cancelReason }).eq("id", cancelModal.id);
      setCancelModal({ isOpen: false, id: null });
      setCancelReason("");
      fetchReservations();
    }
  }

  async function confirmPaymentReceived(id: number) {
    await supabase.from("reservations").update({ payment_confirmed: true }).eq("id", id);
    setConfirmPayModal({ isOpen: false, id: null });
    fetchReservations();
  }

  async function addReservation() {
    if (!newRes.name || !newRes.phone || !newRes.date) return;
    const totalPrice = getPrice(newRes.date);
    await supabase.from("reservations").insert({
      name: newRes.name, phone: newRes.phone, date: newRes.date,
      time: newRes.time, pitch: newRes.pitch, status: "confirmed",
      total_price: totalPrice, amount_paid: 0, payment_confirmed: false,
    });
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
      case "confirmed": return <span className="rounded-full bg-fiver-green/10 px-2 py-0.5 text-xs font-medium text-fiver-green">Confirmée</span>;
      case "paid": return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">💰 Payée</span>;
      case "pending": return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">En attente</span>;
      case "cancelled": return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Annulée</span>;
      default: return null;
    }
  };

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

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
          {[{ key: "all", label: "Toutes" }, { key: "pending", label: "Attente" }, { key: "confirmed", label: "Confirm." }, { key: "paid", label: "Payées" }, { key: "cancelled", label: "Annulées" }].map((f) => (
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
            const totalPrice = r.total_price || getPrice(r.date);
            const amountPaid = r.amount_paid || 0;
            const remaining = totalPrice - amountPaid;
            return (
              <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">{r.name}</p>
                    <p className="text-xs text-white/30">{r.phone}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                  <span>📅 {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  <span>🕐 {r.time}</span>
                  <span>⚽ {r.pitch}</span>
                </div>
                {/* Payment info */}
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm bg-white/5 px-3 py-2">
                  <PaymentMethodBadge method={r.payment_method} />
                  <span className="text-xs text-white/40">|</span>
                  <span className="text-xs text-white/60">{amountPaid.toLocaleString()} / {totalPrice.toLocaleString()} MRU</span>
                  {remaining > 0 && r.status !== "cancelled" && (
                    <span className="text-xs font-medium text-amber-400">Reste: {remaining.toLocaleString()} MRU</span>
                  )}
                  {r.payment_method && r.payment_method !== "especes" && (
                    r.payment_confirmed
                      ? <span className="text-xs text-fiver-green">✓ Reçu</span>
                      : <span className="text-xs text-red-400">✗ Non confirmé</span>
                  )}
                </div>
                {r.status === "paid" && r.payment_receiver && <div className="mb-3 text-xs italic text-blue-400">Encaissé par : {r.payment_receiver}</div>}
                {r.status === "cancelled" && r.cancellation_reason && <div className="mb-3 text-xs italic text-red-400">Raison : {r.cancellation_reason}</div>}
                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  {r.status === "pending" && (
                    <button onClick={() => confirmRes(r.id)} className="flex items-center gap-1 rounded-sm bg-fiver-green/10 px-3 py-1.5 text-xs font-medium text-fiver-green"><Check className="h-3 w-3" /> Confirmer</button>
                  )}
                  {(r.status === "pending" || r.status === "confirmed") && (
                    <button onClick={() => { setPayModal({ isOpen: true, id: r.id, res: r }); setPayMethod(r.payment_method || ""); setPayAmount(String((r.total_price || getPrice(r.date)) - (r.amount_paid || 0))); }} className="flex items-center gap-1 rounded-sm bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400"><DollarSign className="h-3 w-3" /> Encaisser</button>
                  )}
                  {r.payment_method && r.payment_method !== "especes" && !r.payment_confirmed && r.status !== "cancelled" && (
                    <button onClick={() => setConfirmPayModal({ isOpen: true, id: r.id })} className="flex items-center gap-1 rounded-sm bg-fiver-green/10 px-3 py-1.5 text-xs font-medium text-fiver-green"><Check className="h-3 w-3" /> Paiement reçu</button>
                  )}
                  {r.status !== "cancelled" && r.status !== "paid" && (
                    <button onClick={() => setCancelModal({ isOpen: true, id: r.id })} className="flex items-center gap-1 rounded-sm bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400"><XIcon className="h-3 w-3" /> Annuler</button>
                  )}
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
                  const totalPrice = r.total_price || getPrice(r.date);
                  const amountPaid = r.amount_paid || 0;
                  const remaining = totalPrice - amountPaid;
                  return (
                    <tr key={r.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white/80">{r.name}</p>
                        <p className="text-xs text-white/30">{r.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{r.time}</td>
                      <td className="px-5 py-3.5 text-sm text-white/60">{r.pitch}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <PaymentMethodBadge method={r.payment_method} />
                          <span className="text-[10px] text-white/40">{amountPaid.toLocaleString()} / {totalPrice.toLocaleString()} MRU</span>
                          {remaining > 0 && r.status !== "cancelled" && <span className="text-[10px] font-medium text-amber-400">Reste: {remaining.toLocaleString()}</span>}
                          {r.payment_method && r.payment_method !== "especes" && (
                            r.payment_confirmed
                              ? <span className="text-[10px] text-fiver-green">✓ Reçu</span>
                              : <span className="text-[10px] text-red-400">✗ Non confirmé</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {statusBadge(r.status)}
                        {r.status === "paid" && r.payment_receiver && <div className="mt-1 text-[10px] text-blue-400/70">Par {r.payment_receiver}</div>}
                        {r.status === "cancelled" && r.cancellation_reason && <div className="mt-1 text-[10px] text-red-400/70">Raison: {r.cancellation_reason}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "pending" && (
                            <button onClick={() => confirmRes(r.id)} className="rounded-sm p-1.5 text-fiver-green/60 transition-colors hover:bg-fiver-green/10 hover:text-fiver-green" title="Confirmer"><Check className="h-4 w-4" /></button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button onClick={() => { setPayModal({ isOpen: true, id: r.id, res: r }); setPayMethod(r.payment_method || ""); setPayAmount(String((r.total_price || getPrice(r.date)) - (r.amount_paid || 0))); }} className="rounded-sm px-2 py-1 text-xs font-medium text-blue-400/80 transition-colors hover:bg-blue-400/10 hover:text-blue-400" title="Encaisser">💰 Encaisser</button>
                          )}
                          {r.payment_method && r.payment_method !== "especes" && !r.payment_confirmed && r.status !== "cancelled" && (
                            <button onClick={() => setConfirmPayModal({ isOpen: true, id: r.id })} className="rounded-sm px-2 py-1 text-xs font-medium text-fiver-green/80 transition-colors hover:bg-fiver-green/10 hover:text-fiver-green" title="Confirmer réception">✓ Reçu</button>
                          )}
                          {r.status !== "cancelled" && r.status !== "paid" && (
                            <button onClick={() => setCancelModal({ isOpen: true, id: r.id })} className="rounded-sm p-1.5 text-amber-400/60 transition-colors hover:bg-amber-400/10 hover:text-amber-400" title="Annuler"><XIcon className="h-4 w-4" /></button>
                          )}
                        </div>
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
            <p className="mb-5 text-sm text-white/50">Enregistrez le paiement pour cette réservation.</p>
            
            {/* Payment method */}
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Moyen de paiement</label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.value} onClick={() => setPayMethod(pm.value)}
                  className={cn("flex flex-col items-center gap-1 rounded-sm border px-3 py-2.5 text-xs font-medium transition-colors",
                    payMethod === pm.value ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70")}>
                  <pm.icon className="h-4 w-4" />
                  {pm.label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Montant reçu (MRU)</label>
            <input
              type="number"
              placeholder="Ex: 10000"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mb-2 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
            />
            {payModal.res && (
              <p className="mb-4 text-xs text-white/30">
                Total: {(payModal.res.total_price || getPrice(payModal.res.date)).toLocaleString()} MRU 
                {(payModal.res.amount_paid || 0) > 0 && ` · Déjà payé: ${(payModal.res.amount_paid || 0).toLocaleString()} MRU`}
              </p>
            )}

            {/* Receiver */}
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Encaissé par</label>
            <input
              type="text"
              placeholder="Ex: Amadou"
              value={payReceiver}
              onChange={(e) => setPayReceiver(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setPayModal({ isOpen: false, id: null, res: null }); setPayReceiver(""); setPayAmount(""); setPayMethod(""); }} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={submitPayment} disabled={!payReceiver.trim() || !payAmount || !payMethod} className="rounded-sm bg-blue-500 px-5 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirmer</button>
            </div>
            <button onClick={() => { setPayModal({ isOpen: false, id: null, res: null }); setPayReceiver(""); setPayAmount(""); setPayMethod(""); }} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
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

      {/* Confirm Payment Received Modal */}
      {confirmPayModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl relative">
            <h3 className="mb-2 font-[var(--font-heading)] text-lg font-bold text-fiver-green uppercase tracking-wide">Confirmer la réception</h3>
            <p className="mb-5 text-sm text-white/50">Confirmez-vous que le paiement mobile (Bankily/Masrvi) a bien été reçu ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmPayModal({ isOpen: false, id: null })} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={() => confirmPayModal.id && confirmPaymentReceived(confirmPayModal.id)} className="rounded-sm bg-fiver-green px-5 py-2 text-sm font-bold text-fiver-black hover:opacity-90 transition-colors">Oui, reçu ✓</button>
            </div>
            <button onClick={() => setConfirmPayModal({ isOpen: false, id: null })} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
