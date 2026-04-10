"use client";

import { useState, useEffect } from "react";
import { Save, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ParametresPage() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [weekdayOpen, setWeekdayOpen] = useState("16:00");
  const [weekdayClose, setWeekdayClose] = useState("00:00");
  const [weekendOpen, setWeekendOpen] = useState("10:00");
  const [weekendClose, setWeekendClose] = useState("00:00");
  const [priceWeekday, setPriceWeekday] = useState("10000");
  const [priceWeekend, setPriceWeekend] = useState("12000");

  const [closedDatesStr, setClosedDatesStr] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }

  function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }
  const calendarDays = getCalendarDays(viewYear, viewMonth);

  function toggleDate(d: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let arr = closedDatesStr ? closedDatesStr.split(",").map(x => x.trim()).filter(Boolean) : [];
    if (arr.includes(dateStr)) {
      arr = arr.filter(x => x !== dateStr);
    } else {
      arr.push(dateStr);
    }
    setClosedDatesStr(arr.join(", "));
  }

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        if (map.weekday_open) setWeekdayOpen(map.weekday_open);
        if (map.weekday_close) setWeekdayClose(map.weekday_close);
        if (map.weekend_open) setWeekendOpen(map.weekend_open);
        if (map.weekend_close) setWeekendClose(map.weekend_close);
        if (map.price_weekday) setPriceWeekday(map.price_weekday);
        if (map.price_weekend) setPriceWeekend(map.price_weekend);
        if (map.closed_dates) setClosedDatesStr(map.closed_dates);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSaveSettings() {
    const updates = [
      { key: "weekday_open", value: weekdayOpen },
      { key: "weekday_close", value: weekdayClose },
      { key: "weekend_open", value: weekendOpen },
      { key: "weekend_close", value: weekendClose },
      { key: "price_weekday", value: priceWeekday },
      { key: "price_weekend", value: priceWeekend },
      { key: "closed_dates", value: closedDatesStr },
    ];
    for (const u of updates) {
      const { data } = await supabase.from("settings").select("key").eq("key", u.key).limit(1);
      if (data && data.length > 0) {
        await supabase.from("settings").update({ value: u.value }).eq("key", u.key);
      } else {
        await supabase.from("settings").insert({ key: u.key, value: u.value });
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleChangePassword() {
    setPwdError("");
    setPwdSuccess(false);
    if (newPwd.length < 6) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) {
      setPwdError(error.message);
      return;
    }
    setPwdSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setTimeout(() => setPwdSuccess(false), 3000);
  }

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Paramètres</h1>
        <p className="mt-1 text-sm text-white/40">Configurez les horaires, tarifs et informations de votre complexe.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Horaires d&apos;ouverture</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-white/50">Lundi — Jeudi</p>
              <div className="flex items-center gap-2">
                <div className="flex-1"><label className={labelClass}>Ouverture</label><input type="time" value={weekdayOpen} onChange={(e) => setWeekdayOpen(e.target.value)} className={inputClass} /></div>
                <span className="mt-5 text-white/20">→</span>
                <div className="flex-1"><label className={labelClass}>Fermeture</label><input type="time" value={weekdayClose} onChange={(e) => setWeekdayClose(e.target.value)} className={inputClass} /></div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-white/50">Vendredi — Dimanche</p>
              <div className="flex items-center gap-2">
                <div className="flex-1"><label className={labelClass}>Ouverture</label><input type="time" value={weekendOpen} onChange={(e) => setWeekendOpen(e.target.value)} className={inputClass} /></div>
                <span className="mt-5 text-white/20">→</span>
                <div className="flex-1"><label className={labelClass}>Fermeture</label><input type="time" value={weekendClose} onChange={(e) => setWeekendClose(e.target.value)} className={inputClass} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Tarification (MRU / heure)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass}>Lun — Jeu</label><div className="relative"><input type="number" value={priceWeekday} onChange={(e) => setPriceWeekday(e.target.value)} className={inputClass} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">MRU</span></div></div>
            <div><label className={labelClass}>Ven — Dim</label><div className="relative"><input type="number" value={priceWeekend} onChange={(e) => setPriceWeekend(e.target.value)} className={inputClass} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">MRU</span></div></div>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Dates fermées (Fermeture exceptionnelle)</h2>
          <p className="mb-5 text-xs text-white/40">Cliquez sur les jours du calendrier ci-dessous pour fermer le complexe entièrement.</p>
          
          <div className="mx-auto mb-4 max-w-sm rounded-sm bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-sm p-1 text-white/40 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
              <span className="text-sm font-semibold uppercase text-white">{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="rounded-sm p-1 text-white/40 hover:text-white"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => <div key={d} className="py-1 text-center text-xs font-medium text-white/40">{d}</div>)}
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} className="h-8" />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = closedDatesStr.split(",").map(x => x.trim()).includes(dateStr);
                return (
                  <button key={day} onClick={() => toggleDate(day)}
                    className={`h-8 w-full rounded-sm text-xs font-medium transition-colors ${isSelected ? "border border-red-500/30 bg-red-500/20 text-red-400" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          
          {closedDatesStr.trim().length > 0 && (
            <div className="flex flex-wrap gap-2">
              {closedDatesStr.split(",").map(x => x.trim()).filter(Boolean).sort().map(date => (
                <span key={date} className="flex items-center gap-1.5 rounded-sm bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                  {date}
                  <button onClick={() => setClosedDatesStr(closedDatesStr.split(",").map(d => d.trim()).filter(d => d !== date).join(", "))}>
                    <X className="h-3 w-3 hover:text-white" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSaveSettings} className="flex items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
          {saved ? (<><Check className="h-4 w-4" /> Sauvegardé !</>) : (<><Save className="h-4 w-4" /> Enregistrer les paramètres</>)}
        </button>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <h2 className="mb-4 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Changer le mot de passe</h2>
          {pwdError && <div className="mb-3 rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-400">{pwdError}</div>}
          {pwdSuccess && <div className="mb-3 rounded-sm bg-fiver-green/10 px-3 py-2 text-xs text-fiver-green">Mot de passe modifié avec succès !</div>}
          <div className="flex flex-col gap-3">
            <div><label className={labelClass}>Nouveau mot de passe</label><input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" className={inputClass} /></div>
            <div><label className={labelClass}>Confirmer le mot de passe</label><input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" className={inputClass} /></div>
            <button onClick={handleChangePassword} className="mt-1 w-full rounded-sm border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">Modifier le mot de passe</button>
          </div>
        </div>
      </div>
    </div>
  );
}
