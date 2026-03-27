"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, LayoutGrid, User, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

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
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dynamic settings from Supabase
  const [openHour, setOpenHour] = useState(16);
  const [closeHour, setCloseHour] = useState(24);
  const [pitchStatuses, setPitchStatuses] = useState<Record<string, string>>({ "Terrain 1": "available", "Terrain 2": "available" });
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const PRICE = 10000;

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        const isWeekend = selectedDate ? (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) : false;
        if (map[isWeekend ? "weekend_open" : "weekday_open"]) setOpenHour(parseHour(map[isWeekend ? "weekend_open" : "weekday_open"]));
        if (map[isWeekend ? "weekend_close" : "weekday_close"]) setCloseHour(parseHour(map[isWeekend ? "weekend_close" : "weekday_close"]));
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
      const dateStr = selectedDate.toISOString().split("T")[0];
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
    return ALL_SLOTS.filter((s) => s.startHour >= openHour && s.startHour < closeHour).map((s) => ({ time: s.time }));
  }, [openHour, closeHour]);

  const availablePitches = useMemo(() => [
    { id: "Terrain 1", available: pitchStatuses["Terrain 1"] === "available" },
    { id: "Terrain 2", available: pitchStatuses["Terrain 2"] === "available" },
  ], [pitchStatuses]);

  function handlePrev() { if (step > 1) setStep(step - 1); }
  function handleReset() {
    setStep(1); setSelectedDate(null); setSelectedSlot(null); setSelectedPitch(null);
    setName(""); setPhone(""); setConfirmed(false); setError("");
  }
  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot || !selectedPitch || !name || !phone) return;
    setSubmitting(true);
    setError("");
    const dateStr = selectedDate.toISOString().split("T")[0];
    try {
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
        <div className="mt-4 rounded-sm bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          💰 Paiement de {PRICE.toLocaleString()} MRU à régler sur place à l&apos;accueil.
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
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                return (
                  <button key={day} disabled={isPast} onClick={() => { setSelectedDate(date); setTimeout(() => setStep(2), 200); }}
                    className={cn("aspect-square rounded-sm text-sm font-medium transition-colors", isPast && "cursor-not-allowed text-muted-foreground/30", !isPast && !isSelected && "text-foreground hover:bg-fiver-green/10", isSelected && "bg-fiver-green text-fiver-black", isToday && !isSelected && "ring-1 ring-fiver-green/50")}
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
              <p className="mt-1 font-[var(--font-heading)] text-lg font-bold text-fiver-green">{PRICE.toLocaleString()} MRU</p>
              <p className="mt-1 text-xs text-amber-400">💰 À régler sur place</p>
            </div>
            <div>
              <label htmlFor="booking-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nom complet</label>
              <input id="booking-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className="w-full rounded-sm border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />
            </div>
            <div>
              <label htmlFor="booking-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Téléphone</label>
              <input id="booking-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+222 XX XX XX XX" className="w-full rounded-sm border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green" />
            </div>
            {error && <div className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
            <button onClick={handleConfirm} disabled={!name || !phone || submitting}
              className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-sm py-3 text-sm font-semibold uppercase tracking-wide transition-opacity", name && phone && !submitting ? "bg-fiver-green text-fiver-black hover:opacity-90" : "cursor-not-allowed bg-secondary text-muted-foreground")}
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
