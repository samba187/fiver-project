"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Heart,
  Truck,
  Plus,
  MinusCircle,
  Check,
  X,
  History,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface CashEntry {
  id: number;
  entry_date: string; // YYYY-MM-DD
  category: "five" | "academy" | "sport_feminin" | "navette" | "autre" | "depense";
  label: string | null;
  amount: number;
  created_by: string | null;
  created_at: string;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const CATEGORIES = [
  { key: "five", label: "Créneau Five", icon: CircleDollarSign, color: "text-fiver-green", bg: "bg-fiver-green/10", border: "border-fiver-green/20 hover:border-fiver-green/50" },
  { key: "academy", label: "Academy", icon: GraduationCap, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20 hover:border-blue-500/50" },
  { key: "sport_feminin", label: "Sport Féminin", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20 hover:border-pink-500/50" },
  { key: "navette", label: "Navette", icon: Truck, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20 hover:border-amber-500/50" },
] as const;

const AUTRE_CAT = { key: "autre" as const, label: "Autre", icon: Plus, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20 hover:border-violet-500/50" };
const DEPENSE_CAT = { key: "depense" as const, label: "Dépenses", icon: MinusCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20 hover:border-red-500/50" };

function catMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) || (key === "autre" ? AUTRE_CAT : key === "depense" ? DEPENSE_CAT : CATEGORIES[0]);
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

function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

type Step = "home" | "label" | "calendar" | "amount" | "history";

export default function CaisseView() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [step, setStep] = useState<Step>("home");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("cash_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    setEntries(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
  }, [fetchEntries]);

  // Realtime: auto-refresh when staff on the ground adds an entry
  useEffect(() => {
    const channel = supabase
      .channel("cash_entries_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_entries" }, () => fetchEntries())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const totalRecettes = useMemo(() => entries.filter((e) => e.category !== "depense").reduce((s, e) => s + e.amount, 0), [entries]);
  const totalDepenses = useMemo(() => entries.filter((e) => e.category === "depense").reduce((s, e) => s + e.amount, 0), [entries]);
  const solde = totalRecettes - totalDepenses;

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEntries = useMemo(() => entries.filter((e) => e.entry_date === todayStr), [entries, todayStr]);
  const todayRecettes = todayEntries.filter((e) => e.category !== "depense").reduce((s, e) => s + e.amount, 0);
  const todayDepenses = todayEntries.filter((e) => e.category === "depense").reduce((s, e) => s + e.amount, 0);

  const historyByMonth = useMemo(() => {
    const groups: Record<string, { label: string; recettes: number; depenses: number; byCategory: Record<string, number>; days: Record<string, CashEntry[]> }> = {};
    entries.forEach((e) => {
      const d = new Date(e.entry_date + "T00:00:00");
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[monthKey]) {
        groups[monthKey] = { label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), recettes: 0, depenses: 0, byCategory: {}, days: {} };
      }
      if (e.category === "depense") groups[monthKey].depenses += e.amount;
      else groups[monthKey].recettes += e.amount;
      const catKey = e.category === "autre" ? `autre:${e.label || "Autre"}` : e.category;
      groups[monthKey].byCategory[catKey] = (groups[monthKey].byCategory[catKey] || 0) + e.amount;
      if (!groups[monthKey].days[e.entry_date]) groups[monthKey].days[e.entry_date] = [];
      groups[monthKey].days[e.entry_date].push(e);
    });
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({
        key,
        ...val,
        catBreakdown: Object.entries(val.byCategory)
          .filter(([k]) => k !== "depense")
          .map(([k, amount]) => ({
            key: k,
            label: k.startsWith("autre:") ? k.slice(6) : catMeta(k).label,
            meta: catMeta(k.startsWith("autre:") ? "autre" : k),
            amount,
          }))
          .sort((a, b) => b.amount - a.amount),
        dayList: Object.entries(val.days).sort((a, b) => b[0].localeCompare(a[0])),
      }));
  }, [entries]);

  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthStats = historyByMonth.find((m) => m.key === currentMonthKey);

  function openCategory(key: string) {
    setSelectedCategory(key);
    setCustomLabel("");
    if (key === "autre") {
      setStep("label");
      return;
    }
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setSelectedDay(now.getDate());
    setStep("calendar");
  }

  function confirmLabel() {
    if (!customLabel.trim()) return;
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setSelectedDay(now.getDate());
    setStep("calendar");
  }

  function confirmDate() {
    if (selectedDay == null) return;
    setAmount("");
    setNote("");
    setStep("amount");
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  async function saveEntry() {
    const value = parseInt(amount, 10);
    if (!value || value <= 0 || selectedDay == null || !selectedCategory) return;
    setSaving(true);
    const entry_date = fmtDate(viewYear, viewMonth, selectedDay);
    const label = selectedCategory === "autre" ? customLabel.trim() : selectedCategory === "depense" ? note.trim() || null : null;
    const { error } = await supabase.from("cash_entries").insert({
      entry_date,
      category: selectedCategory,
      label,
      amount: value,
      created_by: userEmail,
    });
    setSaving(false);
    if (!error) {
      setToast(selectedCategory === "depense" ? "Dépense enregistrée" : "Recette enregistrée");
      setStep("home");
      fetchEntries();
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm("Supprimer cette saisie ?")) return;
    await supabase.from("cash_entries").delete().eq("id", id);
    fetchEntries();
  }

  function goBack() {
    if (step === "amount") setStep(selectedCategory === "autre" ? "label" : "calendar");
    else if (step === "calendar") setStep(selectedCategory === "autre" ? "label" : "home");
    else if (step === "label") setStep("home");
    else setStep("home");
  }

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const activeCatMeta = selectedCategory ? catMeta(selectedCategory) : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg min-w-0">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-fiver-green px-5 py-2.5 text-sm font-semibold text-fiver-black shadow-lg animate-step">
          {toast}
        </div>
      )}

      {/* ============ HOME ============ */}
      {step === "home" && (
        <div className="animate-step">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white">Caisse</h1>
              <p className="mt-1 text-sm text-white/40">Suivi des recettes & dépenses en temps réel.</p>
            </div>
            <button onClick={fetchEntries} disabled={refreshing} className="rounded-sm bg-white/5 p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* Scoreboard */}
          <div className="mb-6 rounded-xl border border-fiver-green/20 bg-gradient-to-br from-fiver-green/10 via-white/[0.02] to-transparent p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Solde total</p>
            <p className={cn("mt-2 font-[var(--font-heading)] text-4xl font-bold", solde >= 0 ? "text-fiver-green" : "text-red-400")}>
              {fmtMoney(solde)} <span className="text-lg">MRU</span>
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-fiver-green/80">
                <TrendingUp className="h-3.5 w-3.5" /> {fmtMoney(totalRecettes)} MRU
              </span>
              <span className="flex items-center gap-1.5 text-red-400/80">
                <TrendingDown className="h-3.5 w-3.5" /> {fmtMoney(totalDepenses)} MRU
              </span>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4 text-xs text-white/50">
              Aujourd&apos;hui : <span className="font-semibold text-fiver-green">+{fmtMoney(todayRecettes)}</span>
              {todayDepenses > 0 && <span className="ml-1 font-semibold text-red-400">-{fmtMoney(todayDepenses)}</span>} MRU
            </div>
          </div>

          {/* This month, per category */}
          {currentMonthStats && currentMonthStats.catBreakdown.length > 0 && (
            <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40 capitalize">{currentMonthStats.label} — par catégorie</p>
              <div className="flex flex-col gap-2.5">
                {currentMonthStats.catBreakdown.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", c.meta.bg)}>
                        <c.meta.icon className={cn("h-3 w-3", c.meta.color)} />
                      </div>
                      <span className="text-sm text-white/70">{c.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{fmtMoney(c.amount)} MRU</span>
                  </div>
                ))}
                {currentMonthStats.depenses > 0 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", DEPENSE_CAT.bg)}>
                        <DEPENSE_CAT.icon className={cn("h-3 w-3", DEPENSE_CAT.color)} />
                      </div>
                      <span className="text-sm text-white/70">Dépenses</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">-{fmtMoney(currentMonthStats.depenses)} MRU</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category grid */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => openCategory(c.key)}
                className={cn("flex flex-col items-center gap-2 rounded-xl border bg-white/[0.02] p-5 text-center transition-all active:scale-95", c.border)}
              >
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", c.bg)}>
                  <c.icon className={cn("h-5 w-5", c.color)} />
                </div>
                <span className="text-sm font-semibold text-white/90">{c.label}</span>
              </button>
            ))}
            <button
              onClick={() => openCategory("autre")}
              className={cn("flex flex-col items-center gap-2 rounded-xl border bg-white/[0.02] p-5 text-center transition-all active:scale-95", AUTRE_CAT.border)}
            >
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", AUTRE_CAT.bg)}>
                <AUTRE_CAT.icon className={cn("h-5 w-5", AUTRE_CAT.color)} />
              </div>
              <span className="text-sm font-semibold text-white/90">Autre</span>
            </button>
            <button
              onClick={() => openCategory("depense")}
              className={cn("flex flex-col items-center gap-2 rounded-xl border bg-white/[0.02] p-5 text-center transition-all active:scale-95", DEPENSE_CAT.border)}
            >
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", DEPENSE_CAT.bg)}>
                <DEPENSE_CAT.icon className={cn("h-5 w-5", DEPENSE_CAT.color)} />
              </div>
              <span className="text-sm font-semibold text-white/90">Dépenses</span>
            </button>
          </div>

          <button
            onClick={() => setStep("history")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <History className="h-4 w-4" /> Voir l&apos;historique par mois
          </button>
        </div>
      )}

      {/* ============ LABEL (Autre) ============ */}
      {step === "label" && (
        <div className="animate-step">
          <button onClick={goBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <h2 className="mb-1 font-[var(--font-heading)] text-xl font-bold uppercase text-white">Nouvelle catégorie</h2>
          <p className="mb-6 text-sm text-white/40">Précise de quoi il s&apos;agit (ex: Location matériel, Buvette...).</p>
          <input
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Nom de l'activité"
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <button
            onClick={confirmLabel}
            disabled={!customLabel.trim()}
            className="w-full rounded-lg bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black transition-opacity disabled:opacity-30"
          >
            Continuer
          </button>
        </div>
      )}

      {/* ============ CALENDAR ============ */}
      {step === "calendar" && activeCatMeta && (
        <div className="animate-step">
          <button onClick={goBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <div className="mb-6 flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", activeCatMeta.bg)}>
              <activeCatMeta.icon className={cn("h-5 w-5", activeCatMeta.color)} />
            </div>
            <div>
              <h2 className="font-[var(--font-heading)] text-lg font-bold uppercase text-white">
                {selectedCategory === "autre" ? customLabel : activeCatMeta.label}
              </h2>
              <p className="text-xs text-white/40">Sélectionne le jour concerné</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={goToPrevMonth} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold uppercase tracking-wide text-white">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={goToNextMonth} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-white/30">
              {DAYS_OF_WEEK.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => {
                const isSelected = d != null && d === selectedDay;
                const isToday = d != null && fmtDate(viewYear, viewMonth, d) === todayStr;
                return (
                  <button
                    key={i}
                    disabled={d == null}
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-colors",
                      d == null && "invisible",
                      isSelected ? "bg-fiver-green text-fiver-black" : isToday ? "bg-white/10 text-fiver-green" : "text-white/70 hover:bg-white/10"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={confirmDate}
            disabled={selectedDay == null}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-fiver-green py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black transition-opacity disabled:opacity-30"
          >
            <Check className="h-4 w-4" /> Valider la date
          </button>
        </div>
      )}

      {/* ============ AMOUNT ============ */}
      {step === "amount" && activeCatMeta && selectedDay != null && (
        <div className="animate-step">
          <button onClick={goBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <div className="mb-6 text-center">
            <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full", activeCatMeta.bg)}>
              <activeCatMeta.icon className={cn("h-6 w-6", activeCatMeta.color)} />
            </div>
            <h2 className="font-[var(--font-heading)] text-lg font-bold uppercase text-white">
              {selectedCategory === "autre" ? customLabel : activeCatMeta.label}
            </h2>
            <p className="text-xs text-white/40 capitalize">
              {new Date(fmtDate(viewYear, viewMonth, selectedDay) + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wide text-white/40">
            {selectedCategory === "depense" ? "Montant dépensé (MRU)" : "Montant encaissé (MRU)"}
          </label>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={cn(
              "mb-4 w-full rounded-xl border bg-white/[0.03] px-4 py-4 text-center text-3xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-1",
              selectedCategory === "depense" ? "border-red-500/30 focus:border-red-400 focus:ring-red-400" : "border-fiver-green/30 focus:border-fiver-green focus:ring-fiver-green"
            )}
          />

          {(selectedCategory === "depense" || selectedCategory === "autre") && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={selectedCategory === "depense" ? "Raison (ex: salaire, entretien...)" : "Précision (optionnel)"}
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
            />
          )}

          <button
            onClick={saveEntry}
            disabled={saving || !amount || parseInt(amount, 10) <= 0}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-bold uppercase tracking-wide transition-opacity disabled:opacity-30",
              selectedCategory === "depense" ? "bg-red-500 text-white" : "bg-fiver-green text-fiver-black"
            )}
          >
            <Check className="h-4 w-4" /> {saving ? "Enregistrement..." : "Valider et enregistrer"}
          </button>
        </div>
      )}

      {/* ============ HISTORY ============ */}
      {step === "history" && (
        <div className="animate-step">
          <button onClick={() => setStep("home")} className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <h2 className="mb-6 font-[var(--font-heading)] text-xl font-bold uppercase text-white">Historique par mois</h2>

          {historyByMonth.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/30">Aucune saisie pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {historyByMonth.map((m) => {
                const net = m.recettes - m.depenses;
                const isOpen = expandedMonth === m.key;
                return (
                  <div key={m.key} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
                    <button
                      onClick={() => setExpandedMonth(isOpen ? null : m.key)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white capitalize">{m.label}</span>
                      <span className={cn("text-sm font-bold", net >= 0 ? "text-fiver-green" : "text-red-400")}>{fmtMoney(net)} MRU</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-white/5 px-5 py-4">
                        <div className="mb-4 flex gap-4 text-xs">
                          <span className="text-fiver-green/80">+{fmtMoney(m.recettes)} MRU</span>
                          <span className="text-red-400/80">-{fmtMoney(m.depenses)} MRU</span>
                        </div>
                        {m.catBreakdown.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {m.catBreakdown.map((c) => (
                              <span key={c.key} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", c.meta.bg, c.meta.color)}>
                                <c.meta.icon className="h-3 w-3" />
                                {c.label} · {fmtMoney(c.amount)} MRU
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col gap-4">
                          {m.dayList.map(([date, dayEntries]) => {
                            const dayTotal = dayEntries.reduce((s, e) => s + (e.category === "depense" ? -e.amount : e.amount), 0);
                            return (
                              <div key={date}>
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                                    {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                                  </span>
                                  <span className={cn("text-xs font-bold", dayTotal >= 0 ? "text-fiver-green" : "text-red-400")}>{fmtMoney(dayTotal)} MRU</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {dayEntries.map((e) => {
                                    const meta = catMeta(e.category);
                                    return (
                                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", meta.bg)}>
                                            <meta.icon className={cn("h-3 w-3", meta.color)} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-white/80">
                                              {e.category === "autre" ? e.label || "Autre" : meta.label}
                                              {e.category === "depense" && e.label ? ` — ${e.label}` : ""}
                                            </p>
                                            {e.created_by && <p className="truncate text-[10px] text-white/30">{e.created_by}</p>}
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <span className={cn("text-xs font-bold", e.category === "depense" ? "text-red-400" : "text-fiver-green")}>
                                            {e.category === "depense" ? "-" : "+"}
                                            {fmtMoney(e.amount)}
                                          </span>
                                          <button onClick={() => deleteEntry(e.id)} className="text-white/20 hover:text-red-400">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
