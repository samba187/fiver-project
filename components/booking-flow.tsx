"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, LayoutGrid, User, ChevronLeft, ChevronRight, Check, Loader2, Smartphone, CreditCard, Repeat } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "bankily", label: "Bankily", icon: Smartphone, desc: "Paiement mobile", color: "border-yellow-500 bg-yellow-500/10 text-yellow-400" },
  { value: "masrvi", label: "Masrvi", icon: CreditCard, desc: "Paiement mobile", color: "border-purple-500 bg-purple-500/10 text-purple-400" },
];

const ALL_SLOTS = [
  { time: "10h-11h", startHour: 10 }, { time: "11h-12h", startHour: 11 },
  { time: "12h-13h", startHour: 12 }, { time: "13h-14h", startHour: 13 },
  { time: "14h-15h", startHour: 14 }, { time: "15h-16h", startHour: 15 },
  { time: "16h-17h", startHour: 16 }, { time: "17h-18h", startHour: 17 },
  { time: "18h-19h", startHour: 18 }, { time: "19h-20h", startHour: 19 },
  { time: "20h-21h", startHour: 20 }, { time: "21h-22h", startHour: 21 },
  { time: "22h-23h", startHour: 22 }, { time: "23h-00h", startHour: 23 },
  { time: "00h-01h", startHour: 0 }, { time: "01h-02h", startHour: 1 },
  { time: "02h-03h", startHour: 2 },
];

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

function parseHour(timeStr: string): number {
  const h = parseInt(timeStr.split(":")[0]);
  return h === 0 ? 24 : h;
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

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

type BookingMode = "normal" | "abonnement";

export function BookingFlow() {
  const [mode, setMode] = useState<BookingMode | null>(null);
  const [step, setStep] = useState(0); // 0 = mode selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPitch, setSelectedPitch] = useState<string | null>(null);
  const [selectedWeekOffsets, setSelectedWeekOffsets] = useState<number[]>([0]); // [0] = first week always
  const [maxRecurrenceWeeks, setMaxRecurrenceWeeks] = useState(5);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentType, setPaymentType] = useState<"full" | "deposit">("full");
  const [depositAmount, setDepositAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Dynamic settings
  const [openHour, setOpenHour] = useState(16);
  const [closeHour, setCloseHour] = useState(24);
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [pitchStatuses, setPitchStatuses] = useState<Record<string, string>>({ "Terrain 1": "available", "Terrain 2": "available" });
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  // Per-week availability for abonnement
  const [weekAvailability, setWeekAvailability] = useState<Record<number, boolean>>({}); // offset -> available
  const [checkingRecurrence, setCheckingRecurrence] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const currentPrice = useMemo(() => {
    if (!selectedDate) return priceWeekday;
    const isWeekend = [0, 5, 6].includes(selectedDate.getDay());
    return isWeekend ? priceWeekend : priceWeekday;
  }, [selectedDate, priceWeekday, priceWeekend]);

  const totalSessions = selectedWeekOffsets.length;
  const totalPrice = currentPrice * totalSessions;
  const isAbonnement = mode === "abonnement" && selectedWeekOffsets.length > 1;

  // Steps depend on mode
  const STEPS = useMemo(() => {
    if (mode === "abonnement") {
      return [
        { id: 1, label: "Date", icon: Calendar },
        { id: 2, label: "Créneau", icon: Clock },
        { id: 3, label: "Terrain", icon: LayoutGrid },
        { id: 4, label: "Semaines", icon: Repeat },
        { id: 5, label: "Infos", icon: User },
      ];
    }
    return [
      { id: 1, label: "Date", icon: Calendar },
      { id: 2, label: "Créneau", icon: Clock },
      { id: 3, label: "Terrain", icon: LayoutGrid },
      { id: 4, label: "Infos", icon: User },
    ];
  }, [mode]);

  // Map logical step to actual step for normal mode (skip weeks step)
  const infoStep = mode === "abonnement" ? 5 : 4;

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const email = data.user.email?.toLowerCase() || "";
        if (!email.includes("admin") && !email.includes("staff")) {
          setUserId(data.user.id);
          setIsLoggedIn(true);
          const { data: profile } = await supabase.from("user_profiles").select("name, phone, email").eq("id", data.user.id).single();
          if (profile) {
            setName(profile.name);
            setPhone(profile.phone);
            setEmail(profile.email);
          }
        }
      }
    });
  }, []);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        const isWeekend = selectedDate && [0, 5, 6].includes(selectedDate.getDay());
        setOpenHour(parseHour(isWeekend ? (map.weekend_open || "10:00") : (map.weekday_open || "16:00")));
        setCloseHour(parseHour(isWeekend ? (map.weekend_close || "00:00") : (map.weekday_close || "00:00")));
        if (map.price_weekday) setPriceWeekday(parseInt(map.price_weekday));
        if (map.price_weekend) setPriceWeekend(parseInt(map.price_weekend));
        if (map.closed_dates) setClosedDates(map.closed_dates.split(",").map((d: string) => d.trim()));
        if (map.max_recurrence_weeks) setMaxRecurrenceWeeks(parseInt(map.max_recurrence_weeks));
        setPitchStatuses({
          "Terrain 1": map.pitch_1_status || "available",
          "Terrain 2": map.pitch_2_status || "available",
        });
      }
    }
    fetchSettings();
  }, [selectedDate]);

  // Fetch booked slots for selected date
  useEffect(() => {
    async function fetchBooked() {
      if (!selectedDate) return;
      const dateStr = formatDateStr(selectedDate);
      const { data } = await supabase.from("reservations").select("time, pitch").eq("date", dateStr).not("status", "in", '("cancelled","deleted")');
      if (data) {
        const set = new Set<string>();
        data.forEach((r) => set.add(`${r.pitch}:${r.time}`));
        setBookedSlots(set);
      }
    }
    fetchBooked();
  }, [selectedDate]);

  // Check availability for each future week (abonnement mode)
  const checkWeekAvailability = useCallback(async () => {
    if (!selectedDate || !selectedPitch || !selectedSlot || mode !== "abonnement") {
      setWeekAvailability({});
      return;
    }
    setCheckingRecurrence(true);
    const avail: Record<number, boolean> = { 0: true }; // week 0 is already validated in step 2

    for (let w = 1; w < maxRecurrenceWeeks; w++) {
      const futureDate = addWeeks(selectedDate, w);
      const dateStr = formatDateStr(futureDate);

      const { data } = await supabase
        .from("reservations")
        .select("time, pitch")
        .eq("date", dateStr)
        .eq("pitch", selectedPitch)
        .not("status", "in", '("cancelled","deleted")');

      avail[w] = !(data && data.some(r => r.time === selectedSlot));
    }

    setWeekAvailability(avail);
    // Remove any selected weeks that are now unavailable
    setSelectedWeekOffsets(prev => prev.filter(w => w === 0 || avail[w] !== false));
    setCheckingRecurrence(false);
  }, [selectedDate, selectedPitch, selectedSlot, mode, maxRecurrenceWeeks]);

  useEffect(() => {
    checkWeekAvailability();
  }, [checkWeekAvailability]);

  const availableSlots = useMemo(() => {
    if (selectedDate) {
      const dateStr = formatDateStr(selectedDate);
      if (closedDates.includes(dateStr)) return [];
    }
    return ALL_SLOTS.filter((s) => {
      if (closeHour <= openHour) {
        return s.startHour >= openHour || s.startHour < closeHour;
      }
      return s.startHour >= openHour && s.startHour < closeHour;
    }).map((s) => ({ time: s.time }));
  }, [openHour, closeHour, closedDates, selectedDate]);

  const availablePitches = useMemo(() => [
    { id: "Terrain 1", available: pitchStatuses["Terrain 1"] === "available" },
    { id: "Terrain 2", available: pitchStatuses["Terrain 2"] === "available" },
  ], [pitchStatuses]);

  function handlePrev() {
    if (step > 1) setStep(step - 1);
    else if (step === 1) { setStep(0); setMode(null); }
  }

  function handleReset() {
    setStep(0); setMode(null); setSelectedDate(null); setSelectedSlot(null); setSelectedPitch(null);
    setSelectedWeekOffsets([0]); setPaymentMethod(""); setPaymentType("full"); setDepositAmount("");
    setConfirmed(false); setError("");
    if (!isLoggedIn) { setName(""); setPhone(""); setEmail(""); }
  }

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot || !selectedPitch || !paymentMethod) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("Le nom doit contenir entre 2 et 50 caractères.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      setError("Numéro de téléphone invalide (entre 8 et 15 chiffres).");
      return;
    }

    if (mode === "abonnement" && selectedWeekOffsets.length < 2) {
      setError("Sélectionnez au moins 2 semaines pour un abonnement.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Check if client is banned
      const { data: clientCheck } = await supabase.from("clients").select("is_banned").eq("phone", phone).single();
      if (clientCheck?.is_banned) {
        setError("Votre numéro est bloqué. Contactez l'administration de Fiveur Arena.");
        setSubmitting(false);
        return;
      }

      const recurrenceGroup = selectedWeekOffsets.length > 1 ? crypto.randomUUID() : null;
      const declaredDeposit = paymentType === "deposit" ? parseInt(depositAmount) || 0 : totalPrice;

      // Create all reservations
      const inserts = [];
      for (const w of selectedWeekOffsets) {
        const date = addWeeks(selectedDate, w);
        const dateStr = formatDateStr(date);

        // Verify slot still available
        const { data: existing } = await supabase
          .from("reservations").select("id")
          .eq("date", dateStr).eq("time", selectedSlot).eq("pitch", selectedPitch)
          .not("status", "in", '("cancelled","deleted")').limit(1);

        if (existing && existing.length > 0) {
          setError(`Le créneau ${selectedSlot} du ${date.toLocaleDateString("fr-FR")} est déjà pris.`);
          setSubmitting(false);
          return;
        }

        inserts.push({
          name: trimmedName, phone: cleanPhone, email, date: dateStr, time: selectedSlot,
          pitch: selectedPitch, status: "pending",
          payment_method: paymentMethod, total_price: currentPrice,
          amount_paid: 0, payment_confirmed: false,
          user_id: userId, is_recurring: selectedWeekOffsets.length > 1,
          recurrence_group: recurrenceGroup,
          deposit_amount: Math.round(declaredDeposit / totalSessions),
        });
      }

      const { error: dbError } = await supabase.from("reservations").insert(inserts);
      if (dbError) { setError("Erreur lors de la réservation."); setSubmitting(false); return; }

      // Notify admin
      try {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reservation",
            data: { name: trimmedName, phone: cleanPhone, email, date: formatDateStr(selectedDate), time: selectedSlot, pitch: selectedPitch, amount: totalPrice, sessions: totalSessions, recurrence: recurrenceWeeks > 1 },
            origin: window.location.origin,
          }),
        });
      } catch (err) { console.error("Notify error", err); }

      // Update bookedSlots
      setBookedSlots((prev) => {
        const next = new Set(prev);
        next.add(`${selectedPitch}:${selectedSlot}`);
        return next;
      });

      // Upsert client record
      const { data: existingClient } = await supabase.from("clients").select("id, total_bookings").eq("phone", cleanPhone).single();
      if (existingClient) {
        await supabase.from("clients").update({ total_bookings: existingClient.total_bookings + totalSessions, last_booking: formatDateStr(selectedDate), name: trimmedName }).eq("id", existingClient.id);
      } else {
        await supabase.from("clients").insert({ name: trimmedName, phone: cleanPhone, total_bookings: totalSessions, last_booking: formatDateStr(selectedDate) });
      }

      setConfirmed(true);
    } catch { setError("Erreur de connexion."); }
    setSubmitting(false);
  }

  // ─── CONFIRMED VIEW ──────────────────────────────────
  if (confirmed) {
    const declaredDeposit = paymentType === "deposit" ? parseInt(depositAmount) || 0 : totalPrice;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fiver-green">
          <Check className="h-8 w-8 text-fiver-black" />
        </div>
        <h3 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-foreground">Réservation enregistrée !</h3>
        <p className="mt-3 text-muted-foreground">
          {name}, {totalSessions} créneau{totalSessions > 1 ? "x" : ""} réservé{totalSessions > 1 ? "s" : ""} sur {selectedPitch}.
        </p>
        {isAbonnement && (
          <p className="mt-1 text-xs text-muted-foreground/70">Abonnement {totalSessions} semaines à partir du {selectedDate?.toLocaleDateString("fr-FR")}</p>
        )}
        <div className="mt-4 rounded-lg border-2 border-fiver-green/50 bg-fiver-green/10 px-5 py-4 text-left max-w-sm w-full">
          <p className="mb-2 text-sm font-bold text-foreground">⚠️ Validation requise :</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Envoyez la capture d&apos;écran de votre paiement de <strong className="text-foreground">{declaredDeposit.toLocaleString()} MRU{paymentType === "deposit" ? " (acompte)" : ""}</strong> sur WhatsApp.
          </p>
          {paymentType === "deposit" && (
            <p className="mb-3 text-xs text-yellow-500/90">Reste à payer : {(totalPrice - declaredDeposit).toLocaleString()} MRU</p>
          )}
          <a href={`https://wa.me/22248869279?text=${encodeURIComponent(`Salut, c'est ${name}, voici mon reçu pour ${totalSessions} créneau${totalSessions > 1 ? "x" : ""} (${selectedSlot}) sur ${selectedPitch}. Montant envoyé : ${declaredDeposit.toLocaleString()} MRU.`)}`}
            target="_blank" rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#25D366] px-4 py-3 text-sm font-semibold uppercase text-white hover:bg-[#128C7E] transition-colors">
            Envoyer mon reçu {paymentMethod === "bankily" ? "Bankily" : "Masrvi"}
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Demande créée le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.</p>
        <button onClick={handleReset} className="mt-6 rounded-sm bg-fiver-green px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
          Nouvelle réservation
        </button>
      </div>
    );
  }

  // ─── MODE SELECTION (Step 0) ────────────────────────
  if (step === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <h3 className="mb-2 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Réserver un terrain</h3>
        <p className="mb-8 text-center text-xs text-muted-foreground">Choisissez votre type de réservation</p>
        <div className="mx-auto max-w-md flex flex-col gap-4 sm:flex-row">
          <button onClick={() => { setMode("normal"); setSelectedWeekOffsets([0]); setStep(1); }}
            className="flex-1 rounded-sm border-2 border-border bg-card px-6 py-8 text-center transition-all hover:border-fiver-green/50 hover:bg-fiver-green/5 group">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-fiver-green transition-colors" />
            <span className="block font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-foreground">Réservation</span>
            <span className="mt-2 block text-xs text-muted-foreground">Une soirée, un créneau</span>
          </button>
          <button onClick={() => {
            if (!isLoggedIn) {
              setError("Vous devez créer un compte pour prendre un abonnement.");
              return;
            }
            setMode("abonnement"); setSelectedWeekOffsets([0]); setStep(1); setError("");
          }}
            className="flex-1 rounded-sm border-2 border-border bg-card px-6 py-8 text-center transition-all hover:border-fiver-green/50 hover:bg-fiver-green/5 group">
            <Repeat className="mx-auto mb-3 h-8 w-8 text-muted-foreground group-hover:text-fiver-green transition-colors" />
            <span className="block font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-foreground">Abonnement</span>
            <span className="mt-2 block text-xs text-muted-foreground">Même créneau, plusieurs semaines</span>
          </button>
        </div>
        {!isLoggedIn && (
          <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
            Pour l&apos;abonnement, <a href="/compte" className="text-fiver-green underline">créez un compte</a> d&apos;abord.
          </p>
        )}
        {error && (
          <div className="mt-4 mx-auto max-w-md rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 text-center">{error}</div>
        )}
      </div>
    );
  }

  // ─── MAIN FLOW ──────────────────────────────────────
  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-8 overflow-x-auto px-2">
        <div className="flex items-center justify-center gap-1 md:gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex shrink-0 items-center gap-1 md:gap-2">
              <button onClick={() => { if (s.id < step) setStep(s.id); }}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors md:px-3 md:py-2 md:text-xs",
                  step === s.id ? "bg-fiver-green text-fiver-black" : s.id < step ? "bg-fiver-green/20 text-fiver-green" : "bg-secondary text-muted-foreground"
                )}>
                <s.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={cn("h-px w-3 md:w-6", s.id < step ? "bg-fiver-green" : "bg-border")} />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur-sm sm:p-8">

        {/* ─── Step 1: Date ────────────────── */}
        {step === 1 && (
          <div className="animate-step">
            <h3 className="mb-6 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez une date</h3>
            <div className="mx-auto max-w-sm">
              <div className="mb-4 flex items-center justify-between">
                <button onClick={prevMonth} className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
                <span className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronRight className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((d) => <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{d}</div>)}
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  const date = new Date(viewYear, viewMonth, day);
                  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const dateStr = formatDateStr(date);
                  const isClosed = closedDates.includes(dateStr);
                  const isDisabled = isPast || isClosed;
                  const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
                  const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  return (
                    <button key={day} disabled={isDisabled}
                      onClick={() => { setSelectedDate(date); setSelectedSlot(null); setTimeout(() => setStep(2), 200); }}
                      className={cn(
                        "aspect-square rounded-sm text-sm font-medium transition-colors",
                        isDisabled ? "cursor-not-allowed text-muted-foreground/30 opacity-50" : "text-foreground hover:bg-fiver-green/10",
                        isClosed && !isPast && "bg-red-500/5 text-red-500 line-through",
                        isSelected && "bg-fiver-green text-fiver-black",
                        isToday && !isSelected && !isDisabled && "ring-1 ring-fiver-green/50"
                      )}>{day}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Single Time Slot ────── */}
        {step === 2 && (
          <div className="animate-step">
            <h3 className="mb-2 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez votre créneau</h3>
            <p className="mb-6 text-center text-xs text-muted-foreground">
              {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {currentPrice.toLocaleString()} MRU / créneau
            </p>

            {availableSlots.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Aucun créneau disponible pour cette date.</p>
            ) : (
              <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
                {availableSlots.map((slot) => {
                  const pitch1Booked = bookedSlots.has(`Terrain 1:${slot.time}`) || pitchStatuses["Terrain 1"] !== "available";
                  const pitch2Booked = bookedSlots.has(`Terrain 2:${slot.time}`) || pitchStatuses["Terrain 2"] !== "available";
                  const fullyBooked = pitch1Booked && pitch2Booked;
                  const availCount = (pitch1Booked ? 0 : 1) + (pitch2Booked ? 0 : 1);
                  const isSelected = selectedSlot === slot.time;

                  return (
                    <button key={slot.time} disabled={fullyBooked}
                      onClick={() => { if (!fullyBooked) { setSelectedSlot(slot.time); setTimeout(() => setStep(3), 200); } }}
                      className={cn(
                        "relative rounded-sm px-4 py-3 text-sm font-medium transition-colors border-2",
                        fullyBooked && "cursor-not-allowed bg-red-500/5 text-muted-foreground/30 line-through border-transparent",
                        !fullyBooked && !isSelected && "bg-secondary/50 text-foreground hover:border-fiver-green/50 hover:bg-fiver-green/5 border-transparent",
                        isSelected && "bg-fiver-green/10 text-fiver-green border-fiver-green"
                      )}>
                      <span>{slot.time}</span>
                      {fullyBooked && <span className="mt-0.5 block text-[10px] font-normal text-red-400/60 no-underline" style={{ textDecoration: "none" }}>Complet</span>}
                      {!fullyBooked && <span className="mt-0.5 block text-[10px] font-normal text-fiver-green/60">{availCount} terrain{availCount > 1 ? "s" : ""} dispo</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Pitch ──────────────── */}
        {step === 3 && (
          <div className="animate-step">
            <h3 className="mb-6 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez votre terrain</h3>
            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
              {availablePitches.map((pitch) => {
                const slotAvailable = selectedSlot ? !bookedSlots.has(`${pitch.id}:${selectedSlot}`) : true;
                const canSelect = pitch.available && slotAvailable;
                const nextStep = mode === "abonnement" ? 4 : infoStep;
                return (
                  <button key={pitch.id} disabled={!canSelect}
                    onClick={() => { if (canSelect) { setSelectedPitch(pitch.id); setTimeout(() => setStep(nextStep), 200); } }}
                    className={cn("flex-1 rounded-sm border-2 px-6 py-8 text-center transition-colors shadow-sm",
                      !canSelect && "cursor-not-allowed border-secondary bg-secondary text-muted-foreground/40",
                      canSelect && selectedPitch !== pitch.id && "border-border bg-card text-foreground hover:border-fiver-green/50",
                      selectedPitch === pitch.id && "border-fiver-green bg-fiver-green/10 text-foreground")}>
                    <LayoutGrid className={cn("mx-auto mb-3 h-8 w-8", canSelect && selectedPitch === pitch.id ? "text-fiver-green" : canSelect ? "text-muted-foreground" : "text-muted-foreground/30")} />
                    <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide">{pitch.id}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{!pitch.available ? "En maintenance" : !slotAvailable ? "Créneau pris" : "Disponible"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Step 4 (Abonnement only): Weeks ─── */}
        {step === 4 && mode === "abonnement" && (
          <div className="animate-step">
            <h3 className="mb-2 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez vos semaines</h3>
            <p className="mb-6 text-center text-xs text-muted-foreground">{selectedSlot} sur {selectedPitch} chaque semaine</p>

            <div className="mx-auto max-w-sm">
              <div className="flex flex-col gap-2 mb-6">
                {Array.from({ length: maxRecurrenceWeeks }, (_, i) => {
                  const futureDate = addWeeks(selectedDate!, i);
                  const isFirst = i === 0;
                  const isAvailable = weekAvailability[i] !== false;
                  const isSelected = selectedWeekOffsets.includes(i);

                  return (
                    <button key={i}
                      disabled={!isAvailable || isFirst}
                      onClick={() => {
                        if (isFirst) return;
                        setSelectedWeekOffsets(prev =>
                          prev.includes(i) ? prev.filter(w => w !== i) : [...prev, i].sort((a, b) => a - b)
                        );
                      }}
                      className={cn("flex items-center gap-3 rounded-sm border px-3 py-3 text-left transition-colors",
                        !isAvailable ? "border-red-500/20 bg-red-500/5 cursor-not-allowed opacity-60" :
                        isFirst ? "border-fiver-green/30 bg-fiver-green/10" :
                        isSelected ? "border-fiver-green/30 bg-fiver-green/5 hover:bg-fiver-green/10" : "border-border hover:border-fiver-green/20")}>
                      <div className={cn("h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center",
                        !isAvailable ? "border-red-500/30 bg-red-500/10" :
                        isSelected || isFirst ? "border-fiver-green bg-fiver-green" : "border-muted-foreground/30")}>
                        {(isSelected || isFirst) && isAvailable && <Check className="h-3.5 w-3.5 text-fiver-black" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", !isAvailable ? "text-red-400 line-through" : "text-foreground")}>
                          {futureDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        {isFirst && <p className="text-[10px] text-fiver-green">Semaine 1 (incluse)</p>}
                        {!isFirst && isAvailable && <p className="text-[10px] text-muted-foreground">Semaine {i + 1}</p>}
                        {!isAvailable && <p className="text-[10px] text-red-400">Déjà réservé</p>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {checkingRecurrence && <p className="mb-4 text-xs text-muted-foreground animate-pulse text-center">Vérification des disponibilités...</p>}

              {/* Summary */}
              <div className="rounded-sm bg-secondary/80 p-4 border border-border/50 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Total abonnement</p>
                <p className="mt-2 text-sm text-foreground">{selectedSlot} × {totalSessions} semaine{totalSessions > 1 ? "s" : ""}</p>
                <p className="mt-1 font-[var(--font-heading)] text-xl font-bold text-fiver-green">{totalPrice.toLocaleString()} MRU</p>
              </div>

              <button onClick={() => { setError(""); setStep(5); }} disabled={selectedWeekOffsets.length < 2}
                className="w-full rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed">
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ─── Step Infos + Payment ───── */}
        {step === infoStep && (
          <div className="animate-step">
            <h3 className="mb-6 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Vos informations</h3>
            <div className="mx-auto max-w-sm flex flex-col gap-5">
              {/* Recap */}
              <div className="rounded-sm bg-secondary/80 p-4 border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Votre réservation</p>
                <p className="mt-2 text-sm font-medium text-foreground">{selectedDate?.toLocaleDateString("fr-FR")} &middot; {selectedSlot} &middot; {selectedPitch}</p>
                {isAbonnement && <p className="text-xs text-muted-foreground mt-1">Abonnement {totalSessions} semaines</p>}
                <p className="mt-1 font-[var(--font-heading)] text-xl font-bold text-fiver-green">{totalPrice.toLocaleString()} MRU</p>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="booking-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom complet *</label>
                  <input id="booking-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required
                    disabled={isLoggedIn} placeholder="Votre nom complet"
                    className={cn("w-full rounded-sm border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green", isLoggedIn && "opacity-60 cursor-not-allowed")} />
                </div>
                <div>
                  <label htmlFor="booking-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone *</label>
                  <input id="booking-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" required
                    disabled={isLoggedIn} placeholder="Ex: 48 81 38 22"
                    className={cn("w-full rounded-sm border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green", isLoggedIn && "opacity-60 cursor-not-allowed")} />
                </div>
                <div>
                  <label htmlFor="booking-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Email (Optionnel)</label>
                  <input id="booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100}
                    disabled={isLoggedIn} placeholder="Pour recevoir votre reçu"
                    className={cn("w-full rounded-sm border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green", isLoggedIn && "opacity-60 cursor-not-allowed")} />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Moyen de paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
                      className={cn("flex flex-col items-center gap-1.5 rounded-sm border-2 px-3 py-4 text-center transition-all",
                        paymentMethod === pm.value ? pm.color : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30")}>
                      <pm.icon className="h-5 w-5" />
                      <span className="text-xs font-bold uppercase tracking-wide">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment type: full or deposit */}
              {paymentMethod && (
                <>
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Type de paiement</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPaymentType("full")}
                        className={cn("rounded-sm border-2 px-3 py-3 text-center text-xs font-bold uppercase transition-all",
                          paymentType === "full" ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-border text-muted-foreground hover:border-muted-foreground/30")}>
                        Totalité
                      </button>
                      <button type="button" onClick={() => setPaymentType("deposit")}
                        className={cn("rounded-sm border-2 px-3 py-3 text-center text-xs font-bold uppercase transition-all",
                          paymentType === "deposit" ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-border text-muted-foreground hover:border-muted-foreground/30")}>
                        Acompte
                      </button>
                    </div>
                  </div>

                  {paymentType === "deposit" && (
                    <div>
                      <label htmlFor="deposit-amount" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Montant de l&apos;acompte (MRU)</label>
                      <input id="deposit-amount" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={`Total : ${totalPrice.toLocaleString()} MRU`} min={1} max={totalPrice}
                        className="w-full rounded-sm border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />
                      {depositAmount && parseInt(depositAmount) < totalPrice && (
                        <p className="mt-1 text-xs text-yellow-500/80">Reste à payer : {(totalPrice - parseInt(depositAmount)).toLocaleString()} MRU</p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border-2 border-fiver-green/30 bg-fiver-green/5 px-5 py-4">
                    <p className="mb-3 text-sm font-medium text-foreground">Envoyez <strong className="text-fiver-green text-lg font-bold">
                      {paymentType === "full" ? totalPrice.toLocaleString() : (parseInt(depositAmount) || 0).toLocaleString()} MRU</strong> ici :</p>
                    <div className="mb-3 rounded-sm bg-fiver-green/10 border border-fiver-green/20 px-4 py-4 text-center">
                      <p className="text-3xl font-black tracking-widest text-foreground">48 81 38 22</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-fiver-green">via {paymentMethod === "bankily" ? "Bankily" : "Masrvi"}</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">👉 À l&apos;étape suivante, vous devrez nous envoyer la <strong>capture d&apos;écran</strong> sur WhatsApp avec votre nom. <br />⚠️ Sans preuve sous 2h, votre créneau sera libéré.</p>
                  </div>
                </>
              )}

              {error && <div className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</div>}

              <button onClick={handleConfirm} disabled={!name || !phone || !paymentMethod || submitting || (paymentType === "deposit" && !depositAmount)}
                className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-sm py-4 text-sm font-bold uppercase tracking-widest transition-all",
                  name && phone && paymentMethod && !submitting ? "bg-fiver-green text-fiver-black hover:scale-[1.01] hover:shadow-lg" : "cursor-not-allowed bg-secondary text-muted-foreground")}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : "Confirmer ma demande"}
              </button>
            </div>
          </div>
        )}
      </div>

      {step > 0 && !confirmed && (
        <div className="mt-8 flex justify-center">
          <button onClick={handlePrev} className="flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all hover:border-fiver-green hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Retour
          </button>
        </div>
      )}
    </div>
  );
}
