"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, LayoutGrid, User, ChevronLeft, ChevronRight, Check, Loader2, Smartphone, CreditCard, Banknote } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "bankily", label: "Bankily", icon: Smartphone, desc: "Paiement mobile", color: "border-yellow-500 bg-yellow-500/10 text-yellow-400" },
  { value: "masrvi", label: "Masrvi", icon: CreditCard, desc: "Paiement mobile", color: "border-purple-500 bg-purple-500/10 text-purple-400" },
  { value: "especes", label: "Espèces", icon: Banknote, desc: "À l'accueil", color: "border-green-500 bg-green-500/10 text-green-400" },
];

const STEPS = [
  { id: 1, label: "Date", icon: Calendar },
  { id: 2, label: "Horaire", icon: Clock },
  { id: 3, label: "Terrain", icon: LayoutGrid },
  { id: 4, label: "Infos", icon: User },
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

export function BookingFlow() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPitch, setSelectedPitch] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dynamic settings from Supabase
  const [openHour, setOpenHour] = useState(16);
  const [closeHour, setCloseHour] = useState(24);
  const [priceWeekday, setPriceWeekday] = useState(10000);
  const [priceWeekend, setPriceWeekend] = useState(12000);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [pitchStatuses, setPitchStatuses] = useState<Record<string, string>>({ "Terrain 1": "available", "Terrain 2": "available" });
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const currentPrice = useMemo(() => {
    if (!selectedDate) return priceWeekday;
    const isWeekend = [0, 5, 6].includes(selectedDate.getDay());
    return isWeekend ? priceWeekend : priceWeekday;
  }, [selectedDate, priceWeekday, priceWeekend]);

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
        setPitchStatuses({
          "Terrain 1": map.pitch_1_status || "available",
          "Terrain 2": map.pitch_2_status || "available",
        });
      }
    }
    fetchSettings();
  }, [selectedDate]);

  useEffect(() => {
    async function fetchBooked() {
      if (!selectedDate) return;
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const { data } = await supabase.from("reservations").select("time, pitch").eq("date", dateStr).neq("status", "cancelled");
      if (data) {
        const set = new Set<string>();
        data.forEach((r) => set.add(`${r.pitch}:${r.time}`));
        setBookedSlots(set);
      }
    }
    fetchBooked();
  }, [selectedDate]);

  const availableSlots = useMemo(() => {
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      if (closedDates.includes(dateStr)) return [];
    }

    return ALL_SLOTS.filter((s) => {
      if (closeHour <= openHour) {
        return s.startHour >= openHour || s.startHour < closeHour;
      }
      return s.startHour >= openHour && s.startHour < closeHour;
    }).map((s) => ({ time: s.time }));
  }, [openHour, closeHour]);

  const availablePitches = useMemo(() => [
    { id: "Terrain 1", available: pitchStatuses["Terrain 1"] === "available" },
    { id: "Terrain 2", available: pitchStatuses["Terrain 2"] === "available" },
  ], [pitchStatuses]);

  function handlePrev() { if (step > 1) setStep(step - 1); }
  function handleReset() {
    setStep(1); setSelectedDate(null); setSelectedSlot(null); setSelectedPitch(null);
    setName(""); setPhone(""); setPaymentMethod(""); setConfirmed(false); setError("");
  }
  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot || !selectedPitch || !paymentMethod) return;
    
    // Strict input validation
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("Le nom doit contenir entre 2 et 50 caractères.");
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneRegex = /^[234][0-9]{7}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError("Le numéro de téléphone doit contenir exactement 8 chiffres valides (ex: 48813822).");
      return;
    }

    setSubmitting(true);
    setError("");
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    try {
      // Check if client is banned
      const { data: clientCheck } = await supabase.from("clients").select("is_banned").eq("phone", phone).single();
      if (clientCheck?.is_banned) {
        setError("Votre numéro de téléphone est bloqué. Veuillez contacter l'administration de Fiveur Arena.");
        setSubmitting(false);
        return;
      }
      // Check if slot is still available before inserting
      const { data: existing } = await supabase
        .from("reservations")
        .select("id")
        .eq("date", dateStr)
        .eq("time", selectedSlot)
        .eq("pitch", selectedPitch)
        .neq("status", "cancelled")
        .limit(1);
      if (existing && existing.length > 0) {
        setError("Ce créneau vient d'être réservé par quelqu'un d'autre. Veuillez en choisir un autre.");
        setSubmitting(false);
        return;
      }

      const { error: dbError } = await supabase.from("reservations").insert({
        name, phone, date: dateStr, time: selectedSlot, pitch: selectedPitch, status: "pending",
        payment_method: paymentMethod, total_price: currentPrice, amount_paid: 0, payment_confirmed: false,
      });
      if (dbError) { setError("Erreur lors de la réservation."); setSubmitting(false); return; }

      // Update local bookedSlots so the slot is immediately blocked
      setBookedSlots((prev) => new Set(prev).add(`${selectedPitch}:${selectedSlot}`));

      const { data: existingClient } = await supabase.from("clients").select("id, total_bookings").eq("phone", phone).single();
      if (existingClient) {
        await supabase.from("clients").update({ total_bookings: existingClient.total_bookings + 1, last_booking: dateStr, name }).eq("id", existingClient.id);
      } else {
        await supabase.from("clients").insert({ name, phone, total_bookings: 1, last_booking: dateStr });
      }
      setConfirmed(true);
    } catch { setError("Erreur de connexion."); }
    setSubmitting(false);
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fiver-green">
          <Check className="h-8 w-8 text-fiver-black" />
        </div>
        <h3 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-foreground">Réservation enregistrée !</h3>
        <p className="mt-3 text-muted-foreground">
          {name}, votre terrain est réservé pour le {selectedDate?.toLocaleDateString("fr-FR")} de {selectedSlot} sur {selectedPitch}.
        </p>
        <div className="mt-4 rounded-lg border-2 border-fiver-green/50 bg-fiver-green/10 px-5 py-4 text-left">
          {paymentMethod === "especes" ? (
            <p className="text-sm text-muted-foreground">💰 Paiement de {currentPrice.toLocaleString()} MRU à régler sur place à l&apos;accueil.</p>
          ) : (
            <>
              <p className="mb-2 text-sm font-bold text-foreground">⚠️ Envoyez votre acompte pour valider :</p>
              <div className="mb-2 rounded-sm bg-fiver-green/20 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-fiver-green">500 MRU minimum</p>
                <p className="mt-1 text-2xl font-black tracking-wider text-foreground">48 81 38 22</p>
                <p className="mt-1 text-xs font-semibold text-fiver-green">via {paymentMethod === "bankily" ? "Bankily" : "Masrvi"}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">💡 En remarque du transfert, indiquez votre <strong className="text-foreground">prénom</strong> et la <strong className="text-foreground">date</strong>.</p>
            </>
          )}
        </div>
        <button onClick={handleReset} className="mt-6 rounded-sm bg-fiver-green px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
          Nouvelle réservation
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-8 overflow-x-auto px-2">
        <div className="flex items-center justify-center gap-1 md:gap-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex shrink-0 items-center gap-1 md:gap-3">
              <button
                onClick={() => { if (s.id < step) setStep(s.id); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors md:px-4 md:py-2 md:text-xs",
                  step === s.id ? "bg-fiver-green text-fiver-black" : s.id < step ? "bg-fiver-green/20 text-fiver-green" : "bg-secondary text-muted-foreground"
                )}
              >
                <s.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={cn("h-px w-4 md:w-8", s.id < step ? "bg-fiver-green" : "bg-border")} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Date */}
      {step === 1 && (
        <div className="animate-step">
          <h3 className="mb-4 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez une date</h3>
          <div className="mx-auto max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
              <span className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => <div key={d} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">{d}</div>)}
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const date = new Date(viewYear, viewMonth, day);
                const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isClosed = closedDates.includes(dateStr);
                const isDisabled = isPast || isClosed;
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                return (
                  <button key={day} disabled={isDisabled} onClick={() => { setSelectedDate(date); setTimeout(() => setStep(2), 200); }}
                    className={cn(
                      "aspect-square rounded-sm text-sm font-medium transition-colors",
                      isDisabled ? "cursor-not-allowed text-muted-foreground/30 opacity-50" : "text-foreground hover:bg-fiver-green/10",
                      isClosed && !isPast && "bg-red-500/5 text-red-500 line-through",
                      isSelected && "bg-fiver-green text-fiver-black",
                      isToday && !isSelected && !isDisabled && "ring-1 ring-fiver-green/50"
                    )}
                  >{day}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Time Slots */}
      {step === 2 && (
        <div className="animate-step">
          <h3 className="mb-4 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez un créneau</h3>
          {availableSlots.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Aucun créneau disponible pour cette date.</p>
          ) : (
            <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
              {availableSlots.map((slot) => {
                // Check how many pitches are available for this slot
                const pitch1Booked = bookedSlots.has(`Terrain 1:${slot.time}`) || pitchStatuses["Terrain 1"] !== "available";
                const pitch2Booked = bookedSlots.has(`Terrain 2:${slot.time}`) || pitchStatuses["Terrain 2"] !== "available";
                const fullyBooked = pitch1Booked && pitch2Booked;
                const availCount = (pitch1Booked ? 0 : 1) + (pitch2Booked ? 0 : 1);

                return (
                  <button key={slot.time} disabled={fullyBooked}
                    onClick={() => { if (!fullyBooked) { setSelectedSlot(slot.time); setTimeout(() => setStep(3), 200); } }}
                    className={cn(
                      "relative rounded-sm px-4 py-3 text-sm font-medium transition-colors",
                      fullyBooked && "cursor-not-allowed bg-red-500/5 text-muted-foreground/30 line-through",
                      !fullyBooked && selectedSlot !== slot.time && "bg-secondary text-foreground hover:bg-fiver-green/10",
                      selectedSlot === slot.time && "bg-fiver-green text-fiver-black"
                    )}
                  >
                    {slot.time}
                    {fullyBooked && <span className="mt-0.5 block text-[10px] font-normal text-red-400/60 no-underline" style={{ textDecoration: 'none' }}>Complet</span>}
                    {!fullyBooked && <span className="mt-0.5 block text-[10px] font-normal text-fiver-green/60">{availCount} terrain{availCount > 1 ? "s" : ""} dispo</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Pitch */}
      {step === 3 && (
        <div className="animate-step">
          <h3 className="mb-4 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Choisissez votre terrain</h3>
          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            {availablePitches.map((pitch) => {
              const isBooked = selectedSlot ? bookedSlots.has(`${pitch.id}:${selectedSlot}`) : false;
              const canSelect = pitch.available && !isBooked;
              return (
                <button key={pitch.id} disabled={!canSelect} onClick={() => { if (canSelect) { setSelectedPitch(pitch.id); setTimeout(() => setStep(4), 200); } }}
                  className={cn("flex-1 rounded-sm border-2 px-6 py-8 text-center transition-colors", !canSelect && "cursor-not-allowed border-secondary bg-secondary text-muted-foreground/40", canSelect && selectedPitch !== pitch.id && "border-border bg-card text-foreground hover:border-fiver-green/50", selectedPitch === pitch.id && "border-fiver-green bg-fiver-green/10 text-foreground")}
                >
                  <LayoutGrid className={cn("mx-auto mb-3 h-8 w-8", canSelect && selectedPitch === pitch.id ? "text-fiver-green" : canSelect ? "text-muted-foreground" : "text-muted-foreground/30")} />
                  <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide">{pitch.id}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{!pitch.available ? "En maintenance" : isBooked ? "Déjà réservé" : "Disponible"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Details + Confirm */}
      {step === 4 && (
        <div className="animate-step">
          <h3 className="mb-4 text-center font-[var(--font-heading)] text-lg font-semibold uppercase tracking-wide text-foreground">Vos informations</h3>
          <div className="mx-auto max-w-sm flex flex-col gap-4">
            <div className="rounded-sm bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Récapitulatif</p>
              <p className="mt-1 text-sm text-foreground">{selectedDate?.toLocaleDateString("fr-FR")} &middot; {selectedSlot} &middot; {selectedPitch}</p>
              <p className="mt-1 font-[var(--font-heading)] text-lg font-bold text-fiver-green">{currentPrice.toLocaleString()} MRU</p>
            </div>
            <div>
              <label htmlFor="booking-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nom complet</label>
              <input id="booking-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required placeholder="Votre nom complet" className="w-full rounded-sm border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />
            </div>
            <div>
              <label htmlFor="booking-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Téléphone</label>
              <input id="booking-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" required placeholder="Ex: 48 81 38 22" className="w-full rounded-sm border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Moyen de paiement</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-sm border-2 px-3 py-3 text-center transition-all",
                      paymentMethod === pm.value ? pm.color : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                    )}>
                    <pm.icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{pm.label}</span>
                    <span className="text-[10px] opacity-60">{pm.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod && paymentMethod !== "especes" && (
              <div className="rounded-lg border-2 border-fiver-green/50 bg-fiver-green/10 px-5 py-4">
                <p className="mb-2 text-sm font-bold text-foreground">⚠️ Envoyez votre acompte pour valider :</p>
                <div className="mb-2 rounded-sm bg-fiver-green/20 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-fiver-green">500 MRU minimum</p>
                  <p className="mt-1 text-2xl font-black tracking-wider text-foreground">48 81 38 22</p>
                  <p className="mt-1 text-xs font-semibold text-fiver-green">via {paymentMethod === "bankily" ? "Bankily" : "Masrvi"}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">💡 En remarque du transfert, indiquez votre <strong className="text-foreground">prénom</strong> et la <strong className="text-foreground">date</strong> de réservation. Sans réception, votre réservation pourra être annulée.</p>
              </div>
            )}
            {error && <div className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
            <button onClick={handleConfirm} disabled={!name || !phone || !paymentMethod || submitting}
              className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-sm py-3 text-sm font-semibold uppercase tracking-wide transition-opacity", name && phone && paymentMethod && !submitting ? "bg-fiver-green text-fiver-black hover:opacity-90" : "cursor-not-allowed bg-secondary text-muted-foreground")}
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Réservation en cours...</> : "Confirmer la réservation"}
            </button>
          </div>
        </div>
      )}

      {step > 1 && (
        <div className="mt-6">
          <button onClick={handlePrev} className="flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
        </div>
      )}
    </div>
  );
}
