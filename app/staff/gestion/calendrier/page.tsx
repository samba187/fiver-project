"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, X as XIcon, DollarSign, MessageCircle, Eye, Calendar, Clock, MapPin, User, Receipt, Check, Smartphone, CreditCard, Banknote } from "lucide-react";
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
  created_at?: string;
  email?: string;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const TOTAL_SLOTS_PER_DAY = 17;

const PAYMENT_METHODS = [
  { value: "bankily", label: "Bankily", icon: Smartphone, color: "text-yellow-400", className: "bg-yellow-500/10 text-yellow-400" },
  { value: "masrvi", label: "Masrvi", icon: CreditCard, color: "text-purple-400", className: "bg-purple-500/10 text-purple-400" },
  { value: "especes", label: "Espèces", icon: Banknote, color: "text-green-400", className: "bg-green-500/10 text-green-400" },
];

function PaymentMethodBadge({ method }: { method?: string }) {
  const pm = PAYMENT_METHODS.find(p => p.value === method);
  if (!pm) return <span className="text-xs text-white/30">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.className)}>
      <pm.icon className="h-3 w-3" />
      {pm.label}
    </span>
  );
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendrierPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pitchFilter, setPitchFilter] = useState<string>("all");

  // Pricing
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);

  // Detail modal
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; res: Reservation | null }>({ isOpen: false, res: null });
  function openDetail(res: Reservation) { setDetailModal({ isOpen: true, res }); }
  function closeDetail() { setDetailModal({ isOpen: false, res: null }); }

  // Payment modal
  const [payModal, setPayModal] = useState<{ isOpen: boolean; id: number | null; res: Reservation | null }>({ isOpen: false, id: null, res: null });
  const [payReceiver, setPayReceiver] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");

  // Cancel modal
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [cancelReason, setCancelReason] = useState("");

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

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

  function getPrice(date: string) {
    const d = new Date(date);
    const isWeekend = [0, 5, 6].includes(d.getDay());
    return isWeekend ? priceWeekend : priceWeekday;
  }

  const fetchReservations = useCallback(async () => {
    const startDate = fmtDate(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endDate = fmtDate(viewYear, viewMonth, lastDay);

    const { data } = await supabase
      .from("reservations")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("status", "deleted")
      .neq("status", "cancelled")
      .order("time", { ascending: true });

    setReservations(data || []);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  async function submitPayment() {
    if (payModal.id && payReceiver.trim() && payAmount) {
      const amount = parseInt(payAmount);
      const res = payModal.res;
      const totalPrice = res?.total_price || getPrice(res?.date || "");
      const newTotal = (res?.amount_paid || 0) + amount;

      await supabase.from("reservations").update({
        status: "paid",
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

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  }

  const resByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      const filtered = pitchFilter === "all" || r.pitch === pitchFilter;
      if (filtered) {
        if (!map[r.date]) map[r.date] = [];
        map[r.date].push(r);
      }
    });
    return map;
  }, [reservations, pitchFilter]);

  const selectedDateStr = selectedDay ? fmtDate(viewYear, viewMonth, selectedDay) : null;
  const selectedDayReservations = selectedDateStr ? (resByDate[selectedDateStr] || []) : [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "paid": return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">💰 Payée</span>;
      case "pending": return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">⏳ En attente</span>;
      case "cancelled": return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Annulée</span>;
      default: return null;
    }
  };

  const getWhatsAppLink = (r: Reservation) => {
    const formattedPhone = r.phone.replace(/\s+/g, "").startsWith("+") ? r.phone.replace(/\s+/g, "").slice(1) : r.phone.replace(/\s+/g, "").startsWith("222") ? r.phone.replace(/\s+/g, "") : `222${r.phone.replace(/\s+/g, "")}`;
    const totalPrice = r.total_price || getPrice(r.date);
    const text = `*FIVEUR ARENA*\n\nBonjour ${r.name},\nVotre demande de réservation pour le *${r.pitch}* le *${new Date(r.date).toLocaleDateString("fr-FR")}* à *${r.time}* a bien été reçue.\n\n⚠️ Veuillez payer la somme de *${totalPrice} MRU* via *Bankily* ou *Masrvi* au numéro 48 81 38 22.\n\n👉 *Merci de répondre à ce message avec la capture d'écran du paiement pour confirmer votre créneau.*`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" /></div>);
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Calendrier</h1>
        <p className="mt-1 text-sm text-white/40">Vue d&apos;ensemble des réservations par jour.</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="rounded-sm p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[160px] text-center font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">{MONTHS[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} className="rounded-sm p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-1 rounded-sm border border-white/10 bg-white/5 p-0.5">
          {[{ key: "all", label: "Tous" }, { key: "Terrain 1", label: "Terrain 1" }, { key: "Terrain 2", label: "Terrain 2" }].map(f => (
            <button key={f.key} onClick={() => setPitchFilter(f.key)}
              className={cn("rounded-sm px-3 py-1.5 text-xs font-medium transition-colors", pitchFilter === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-white/30">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`pad-${idx}`} className="aspect-square" />;
              const dateStr = fmtDate(viewYear, viewMonth, day);
              const dayRes = resByDate[dateStr] || [];
              const count = dayRes.length;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = selectedDay === day;
              const maxSlots = pitchFilter === "all" ? TOTAL_SLOTS_PER_DAY * 2 : TOTAL_SLOTS_PER_DAY;
              const ratio = maxSlots > 0 ? count / maxSlots : 0;

              let dotColor = "bg-white/10";
              if (count > 0 && ratio < 0.5) dotColor = "bg-fiver-green";
              else if (ratio >= 0.5 && ratio < 1) dotColor = "bg-amber-400";
              else if (ratio >= 1) dotColor = "bg-red-400";

              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-sm p-1 transition-colors aspect-square",
                    isSelected ? "bg-fiver-green/20 ring-1 ring-fiver-green" : "hover:bg-white/5",
                    isToday && !isSelected && "ring-1 ring-white/20"
                  )}>
                  <span className={cn("text-sm font-medium", isToday ? "text-fiver-green" : "text-white/70")}>{day}</span>
                  {count > 0 && (
                    <div className="flex items-center gap-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                      <span className="text-[9px] font-medium text-white/40">{count}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-fiver-green" /> Peu réservé</div>
            <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Moyen</div>
            <div className="flex items-center gap-1.5 text-xs text-white/30"><div className="h-2.5 w-2.5 rounded-full bg-red-400" /> Complet</div>
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="w-full lg:w-80">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            {selectedDay ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">
                    {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white"><XIcon className="h-4 w-4" /></button>
                </div>
                {selectedDayReservations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/30">Aucune réservation ce jour.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedDayReservations.map(r => (
                      <div key={r.id} onClick={() => openDetail(r)}
                        className="cursor-pointer rounded-sm border border-white/5 bg-white/[0.02] p-3 transition-all duration-200 hover:border-fiver-green/20 hover:bg-white/[0.04] active:scale-[0.98]">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-fiver-green">{r.time}</span>
                          <div className="flex items-center gap-1.5">
                            {statusBadge(r.status)}
                            <Eye className="h-3 w-3 text-white/20" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-white/80">{r.name}</p>
                        <p className="text-xs text-white/30">{r.phone}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-white/40">
                          <span>⚽ {r.pitch}</span>
                          <PaymentMethodBadge method={r.payment_method} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-white/30">Cliquez sur un jour pour voir les réservations</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal.isOpen && detailModal.res && (() => {
        const r = detailModal.res;
        const totalPrice = r.total_price || getPrice(r.date);
        const amountPaid = r.amount_paid || 0;
        const remaining = totalPrice - amountPaid;
        const progressPercent = Math.min((amountPaid / totalPrice) * 100, 100);
        const dateObj = new Date(r.date);
        const dayName = dateObj.toLocaleDateString("fr-FR", { weekday: "long" });
        const dateFormatted = dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md animate-in fade-in duration-200" onClick={closeDetail}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-in zoom-in-95 duration-300 rounded-xl border border-white/10 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] shadow-2xl shadow-black/50 relative overflow-hidden">
              {/* Top bar */}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status)}
                    <button onClick={closeDetail} className="rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
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

              {/* Payment */}
              <div className="mx-6 mt-4 rounded-lg border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-white/30" />
                    <span className="text-xs font-medium uppercase tracking-wide text-white/40">Paiement</span>
                  </div>
                  <PaymentMethodBadge method={r.payment_method} />
                </div>
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
                {r.status === "paid" && r.payment_receiver && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400/70">
                    <User className="h-3 w-3" />
                    <span>Encaissé par <span className="font-medium text-blue-400">{r.payment_receiver}</span></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 px-6 pt-5 pb-6">
                {r.status === "pending" && (
                  <button onClick={(e) => { e.stopPropagation(); closeDetail(); setPayModal({ isOpen: true, id: r.id, res: r }); setPayMethod(r.payment_method || ""); setPayAmount(String((r.total_price || getPrice(r.date)) - (r.amount_paid || 0))); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/20">
                    <DollarSign className="h-4 w-4" /> Encaisser
                  </button>
                )}
                {r.status === "pending" && (
                  <a href={getWhatsAppLink(r)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366]/10 px-4 py-2.5 text-xs font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {r.status !== "cancelled" && r.status !== "paid" && (
                  <button onClick={(e) => { e.stopPropagation(); closeDetail(); setCancelModal({ isOpen: true, id: r.id }); }} className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20">
                    <XIcon className="h-4 w-4" /> Annuler
                  </button>
                )}
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

      {/* Payment Modal */}
      {payModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#161616] p-6 shadow-2xl relative">
            <h3 className="mb-2 font-[var(--font-heading)] text-lg font-bold text-white uppercase tracking-wide">Encaissement</h3>
            <p className="mb-5 text-sm text-white/50">Enregistrez le paiement pour cette réservation.</p>

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

            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Montant reçu (MRU)</label>
            <input type="number" placeholder="Ex: 10000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              className="mb-4 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />

            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Encaissé par</label>
            <input type="text" placeholder="Ex: Amadou" value={payReceiver} onChange={(e) => setPayReceiver(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
              autoFocus />
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
            <input type="text" placeholder="Ex: Le client n'est pas venu" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              className="mb-6 w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelModal({ isOpen: false, id: null }); setCancelReason(""); }} className="rounded-sm px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Retour</button>
              <button onClick={submitCancel} className="rounded-sm bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors">Annuler la résa</button>
            </div>
            <button onClick={() => { setCancelModal({ isOpen: false, id: null }); setCancelReason(""); }} className="absolute right-4 top-4 text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
