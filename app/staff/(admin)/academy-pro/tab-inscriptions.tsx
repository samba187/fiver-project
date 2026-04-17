"use client";

import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import { Plus, Search, X as XIcon, Save, Camera, CreditCard, AlertTriangle, Zap, Pencil, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Registration, Tarifs } from "./page";

const inputClass = "w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green transition-colors";
const CATEGORIES = ["U5", "U7", "U9", "U11", "U12F", "U13", "U15", "U15F"];
const MOYENS_PAIEMENT = ["Bankily", "Masrvi", "Cash", "Autre"];

function calcAge(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000);
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/** 
 * Calcule le VRAI statut unifié pour le mois en cours.
 * Un seul statut, pas deux colonnes contradictoires.
 */
export function getStatutMoisEnCours(r: Registration, jourLimite: number): { label: string; cls: string; badgeCls: string; status: "ok" | "attente" | "retard" | "partiel" | "offert" } {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = now.getDate();

  // Inscription fin de mois → premier mois gratuit
  if (r.inscription_fin_de_mois && r.created_at) {
    const createdDate = new Date(r.created_at);
    if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) {
      return { label: "🆕 Mois offert", cls: "text-blue-400 font-medium", badgeCls: "bg-blue-500/10 text-blue-400", status: "offert" };
    }
  }

  // A-t-il payé CE MOIS-CI ?
  const paidThisMonth = r.date_paiement && r.date_paiement.startsWith(currentMonth);

  if (paidThisMonth) {
    if (r.montant_paye >= r.tarif_total) {
      return { label: "✅ À jour", cls: "text-green-400 font-medium", badgeCls: "bg-green-500/10 text-green-400", status: "ok" };
    } else {
      return { label: `🟡 Partiel (${r.montant_paye}/${r.tarif_total})`, cls: "text-amber-400", badgeCls: "bg-amber-500/10 text-amber-400", status: "partiel" };
    }
  }

  // Pas payé ce mois
  if (dayOfMonth <= jourLimite) {
    return { label: `🟡 J-${jourLimite - dayOfMonth}`, cls: "text-amber-400", badgeCls: "bg-amber-500/10 text-amber-400", status: "attente" };
  }

  // Après la deadline → EN RETARD
  return { label: `🔴 Retard (+${dayOfMonth - jourLimite}j)`, cls: "text-red-400 font-bold", badgeCls: "bg-red-500/10 text-red-400", status: "retard" };
}

const emptyForm = (): Omit<Registration, "id" | "created_at"> => ({
  nom: "", prenom: "", nom_pere: null, date_naissance: null, sexe: "M", telephone_parent: null, adresse: null,
  football: true, centre_loisirs: false, categorie_foot: "", tarif_football: 0, tarif_loisirs: 0,
  tarif_total: 0, montant_paye: 0, statut_paiement: "en_attente", date_paiement: null,
  date_limite_paiement: null, observations: null, moyen_paiement: null, photo_url: null,
  frais_inscription: 1000, frais_inscription_paye: false, inscription_fin_de_mois: false,
});

export function TabInscriptions({ registrations, tarifs, onRefresh }: { registrations: Registration[]; tarifs: Tarifs; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [uploadingObj, setUploadingObj] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Payment mini-modal state
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [quickPayPlayer, setQuickPayPlayer] = useState<Registration | null>(null);
  const [quickPayMontant, setQuickPayMontant] = useState(0);
  const [quickPayMoyen, setQuickPayMoyen] = useState("");
  const [quickPaySaving, setQuickPaySaving] = useState(false);

  const filtered = useMemo(() => {
    return registrations.filter(r => {
      if (filterCat !== "all" && r.categorie_foot !== filterCat) return false;
      if (filterStatus !== "all") {
        const s = getStatutMoisEnCours(r, tarifs.jourLimitePaiement);
        if (filterStatus === "ok" && s.status !== "ok") return false;
        if (filterStatus === "retard" && s.status !== "retard") return false;
        if (filterStatus === "attente" && s.status !== "attente" && s.status !== "partiel") return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (!(r.nom + " " + r.prenom + " " + (r.nom_pere || "")).toLowerCase().includes(s) && !(r.telephone_parent || "").includes(s)) return false;
      }
      return true;
    });
  }, [registrations, search, filterCat, filterStatus, tarifs.jourLimitePaiement]);

  function determineCategory(age: number | null, isGirl: boolean): string {
    if (!age) return "";
    if (isGirl) {
      if (age <= 12) return "U12F";
      return "U15F";
    }
    if (age <= 5) return "U5";
    if (age <= 7) return "U7";
    if (age <= 9) return "U9";
    if (age <= 11) return "U11";
    if (age <= 13) return "U13";
    return "U15";
  }

  function handleFormChange(updates: Partial<typeof form>) {
    setForm(prev => {
      const next = { ...prev, ...updates };
      if (updates.date_naissance !== undefined || updates.sexe !== undefined) {
        const age = calcAge(next.date_naissance);
        if (age) next.categorie_foot = determineCategory(age, next.sexe === "F");
      }
      if (updates.football !== undefined || updates.centre_loisirs !== undefined) {
        if (next.football && next.centre_loisirs) {
          next.tarif_total = tarifs.tarifCombo;
          next.tarif_football = Math.round(tarifs.tarifCombo / 2);
          next.tarif_loisirs = tarifs.tarifCombo - next.tarif_football;
        } else if (next.football) {
          next.tarif_total = tarifs.tarifFoot;
          next.tarif_football = tarifs.tarifFoot;
          next.tarif_loisirs = 0;
        } else if (next.centre_loisirs) {
          next.tarif_total = tarifs.tarifLoisirs;
          next.tarif_football = 0;
          next.tarif_loisirs = tarifs.tarifLoisirs;
        } else {
          next.tarif_total = 0;
          next.tarif_football = 0;
          next.tarif_loisirs = 0;
        }
      }
      return next;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingObj(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { data, error } = await supabase.storage.from("academy_photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("academy_photos").getPublicUrl(data.path);
        if (urlData) handleFormChange({ photo_url: urlData.publicUrl });
      }
    } catch (err) { console.error(err); }
    setUploadingObj(false);
  }

  function openAdd() {
    setEditingId(null);
    const f = emptyForm();
    f.frais_inscription = tarifs.fraisInscription;
    const today = new Date().getDate();
    if (today >= tarifs.seuilFinDeMois) f.inscription_fin_de_mois = true;
    setForm(f);
    setModalOpen(true);
  }

  function openEdit(r: Registration) {
    setEditingId(r.id);
    const { id, created_at, ...rest } = r;
    setForm(rest);
    setModalOpen(true);
  }

  async function saveReg() {
    if (!form.nom || !form.prenom) return;
    const payload = { ...form, date_naissance: form.date_naissance || null, date_paiement: form.date_paiement || null, date_limite_paiement: form.date_limite_paiement || null };
    if (editingId) {
      await supabase.from("academy_registrations").update(payload).eq("id", editingId);
    } else {
      await supabase.from("academy_registrations").insert(payload);
    }
    setModalOpen(false);
    onRefresh();
  }

  // ====== QUICK PAYMENT ======
  function openQuickPay(r: Registration) {
    setQuickPayPlayer(r);
    setQuickPayMontant(r.tarif_total);
    setQuickPayMoyen(r.moyen_paiement || "");
    setQuickPayOpen(true);
  }

  async function submitQuickPay() {
    if (!quickPayPlayer) return;
    setQuickPaySaving(true);
    const today = new Date().toISOString().split("T")[0];
    const newStatut = quickPayMontant >= quickPayPlayer.tarif_total ? "paye" : quickPayMontant > 0 ? "partiel" : "en_attente";
    await supabase.from("academy_registrations").update({
      montant_paye: quickPayMontant,
      moyen_paiement: quickPayMoyen || null,
      statut_paiement: newStatut,
      date_paiement: today,
    }).eq("id", quickPayPlayer.id);

    // Historique
    if (quickPayMontant > 0) {
      const isFullPay = quickPayMontant >= quickPayPlayer.tarif_total;
      const monthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      await supabase.from("academy_payments_history").insert({
        registration_id: quickPayPlayer.id,
        mois_concerne: monthStr,
        montant: quickPayMontant,
        moyen_paiement: quickPayMoyen || null,
        description: isFullPay ? "Mensualité" : "Acompte"
      });
    }
    setQuickPaySaving(false);
    setQuickPayOpen(false);
    setQuickPayPlayer(null);
    onRefresh();
  }

  const totalDuNow = form.tarif_total + (form.frais_inscription_paye ? 0 : form.frais_inscription);
  const isFinDeMois = new Date().getDate() >= tarifs.seuilFinDeMois;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher nom, téléphone..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="w-auto rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-fiver-green focus:outline-none">
            <option value="all" className="bg-[#161616]">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#161616]">{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-auto rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-fiver-green focus:outline-none">
            <option value="all" className="bg-[#161616]">Tous statuts</option>
            <option value="ok" className="bg-[#161616]">✅ À jour</option>
            <option value="attente" className="bg-[#161616]">🟡 En attente</option>
            <option value="retard" className="bg-[#161616]">🔴 En retard</option>
          </select>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-sm bg-fiver-green px-4 py-2.5 text-xs font-semibold uppercase text-fiver-black hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Inscrire
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/40">{filtered.length} inscrit(s)</p>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>📅 Deadline : le <strong className="text-white">{tarifs.jourLimitePaiement}</strong> du mois</span>
          {isFinDeMois && <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-400 font-bold text-[10px]">⚠️ FIN DE MOIS</span>}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#121212] shadow-xl">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-white/40">
              <th className="px-3 py-4 w-12"></th>
              <th className="px-3 py-4">Nom Complet</th>
              <th className="px-3 py-4">Âge</th>
              <th className="px-3 py-4">Cat.</th>
              <th className="px-3 py-4">Prest.</th>
              <th className="px-3 py-4">Tarif</th>
              <th className="px-3 py-4">Statut Mois</th>
              <th className="px-3 py-4">Frais Insc.</th>
              <th className="px-3 py-4 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const age = calcAge(r.date_naissance);
              const statut = getStatutMoisEnCours(r, tarifs.jourLimitePaiement);
              return (
                <tr key={r.id} onClick={() => openQuickPay(r)} className={cn("group cursor-pointer border-b border-white/5 transition-all hover:bg-white/[0.04]")}>
                  <td className="px-3 py-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5 flex items-center justify-center relative">
                      {r.photo_url ? (
                        <Image src={r.photo_url} alt={r.nom} fill className="object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-white/30">{r.prenom.charAt(0)}{r.nom.charAt(0)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-bold text-white group-hover:text-fiver-green transition-colors">
                      {r.prenom} {r.nom_pere ? r.nom_pere + " " : ""}{r.nom}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">{r.telephone_parent || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50">{age ? `${age}a` : "—"}</td>
                  <td className="px-3 py-3">
                    {r.categorie_foot ? <span className="rounded bg-fiver-green/10 px-2 py-0.5 text-[10px] font-bold text-fiver-green">{r.categorie_foot}</span> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50">
                    {r.football && <span className="mr-0.5">⚽</span>}
                    {r.centre_loisirs && <span>🎯</span>}
                  </td>
                  <td className="px-3 py-3 text-sm font-mono font-bold text-white/70">{r.tarif_total.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", statut.badgeCls)}>
                      {statut.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {r.frais_inscription_paye ? (
                      <span className="text-[10px] text-green-400/60">✅</span>
                    ) : (
                      <span className="text-[10px] text-red-400 font-bold">{r.frais_inscription}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        className="rounded-md p-1.5 text-white/20 hover:bg-white/5 hover:text-white/60 transition-colors"
                        title="Modifier la fiche"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {statut.status === "ok" && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ====== QUICK PAYMENT MODAL — PRO ====== */}
      {quickPayOpen && quickPayPlayer && (() => {
        const age = calcAge(quickPayPlayer.date_naissance);
        const statut = getStatutMoisEnCours(quickPayPlayer, tarifs.jourLimitePaiement);
        const prestation = quickPayPlayer.football && quickPayPlayer.centre_loisirs ? "Foot + Loisirs" : quickPayPlayer.football ? "Football" : "Centre de Loisirs";
        const isFullPay = quickPayMontant >= quickPayPlayer.tarif_total;
        const isPartial = quickPayMontant > 0 && quickPayMontant < quickPayPlayer.tarif_total;
        const monthName = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200" onClick={() => setQuickPayOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-[#111111] to-[#0a0a0a] shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            
            {/* Header — Player identity */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fiver-green/10 via-transparent to-transparent" />
              <div className="relative flex items-start justify-between p-5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-fiver-green/30 bg-[#1a1a1a] flex items-center justify-center shadow-lg shadow-fiver-green/10">
                    {quickPayPlayer.photo_url ? (
                      <Image src={quickPayPlayer.photo_url} alt="Photo" fill className="object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white/30">{quickPayPlayer.prenom.charAt(0)}{quickPayPlayer.nom.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {quickPayPlayer.prenom} {quickPayPlayer.nom_pere ? quickPayPlayer.nom_pere + " " : ""}{quickPayPlayer.nom}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                      {age && <span>{age} ans</span>}
                      {quickPayPlayer.categorie_foot && (
                        <>
                          <span className="text-white/10">·</span>
                          <span className="rounded bg-fiver-green/10 px-1.5 py-0.5 text-[10px] font-bold text-fiver-green">{quickPayPlayer.categorie_foot}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setQuickPayOpen(false)} className="rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Sub-header — Status & tarif */}
              <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Paiement — {monthName}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black text-white">{quickPayPlayer.tarif_total.toLocaleString()}</span>
                    <span className="text-xs text-white/30">MRU</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", statut.badgeCls)}>{statut.label}</span>
                  <span className="text-[10px] text-white/25">{prestation}</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 flex flex-col gap-5">

              {/* Montant rapide */}
              <div>
                <label className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Montant encaissé</span>
                  <div className="flex gap-1">
                    {[quickPayPlayer.tarif_total, Math.round(quickPayPlayer.tarif_total / 2)].map(preset => (
                      <button key={preset} onClick={() => setQuickPayMontant(preset)}
                        className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold transition-all",
                          quickPayMontant === preset ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50")}>
                        {preset === quickPayPlayer.tarif_total ? "Total" : "Moitié"}
                      </button>
                    ))}
                  </div>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={quickPayMontant} 
                    onChange={e => setQuickPayMontant(parseInt(e.target.value) || 0)} 
                    className="w-full rounded-xl border-2 border-white/10 bg-[#0f0f0f] px-5 py-4 text-center font-mono text-3xl font-black text-white placeholder:text-white/20 focus:border-fiver-green focus:outline-none focus:ring-2 focus:ring-fiver-green/20 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/20">MRU</span>
                </div>
                {isPartial && (
                  <p className="mt-1.5 text-center text-[11px] text-amber-400">
                    ⚠️ Paiement partiel — reste {(quickPayPlayer.tarif_total - quickPayMontant).toLocaleString()} MRU
                  </p>
                )}
              </div>

              {/* Moyen de paiement */}
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-white/40">Moyen de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "Bankily", icon: "📱", desc: "Mobile Money" },
                    { id: "Masrvi", icon: "📲", desc: "Mobile Money" },
                    { id: "Cash", icon: "💵", desc: "Espèces" },
                    { id: "Autre", icon: "💳", desc: "Autre moyen" },
                  ].map(m => (
                    <button key={m.id} onClick={() => setQuickPayMoyen(m.id)}
                      className={cn("flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                        quickPayMoyen === m.id 
                          ? "border-fiver-green bg-fiver-green/5 shadow-lg shadow-fiver-green/10" 
                          : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]")}>
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className={cn("text-sm font-bold", quickPayMoyen === m.id ? "text-fiver-green" : "text-white/70")}>{m.id}</p>
                        <p className="text-[10px] text-white/25">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={submitQuickPay}
                disabled={quickPaySaving || !quickPayMoyen || quickPayMontant <= 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 rounded-xl py-4 text-sm font-black uppercase tracking-wider shadow-xl transition-all",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                  isFullPay
                    ? "bg-fiver-green text-fiver-black shadow-fiver-green/30 hover:shadow-fiver-green/50 hover:brightness-110"
                    : isPartial
                      ? "bg-amber-500 text-black shadow-amber-500/20 hover:shadow-amber-500/40 hover:brightness-110"
                      : "bg-white/10 text-white/50"
                )}
              >
                {quickPaySaving ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    {isFullPay ? "Confirmer le paiement" : isPartial ? "Enregistrer le partiel" : "Sélectionner un montant"}
                  </>
                )}
              </button>

              {/* Résumé visuel */}
              {quickPayMoyen && quickPayMontant > 0 && (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Résumé</p>
                  <p className="text-xs text-white/50">
                    <strong className="text-white">{quickPayMontant.toLocaleString()} MRU</strong> via <strong className="text-white">{quickPayMoyen}</strong>
                    {" — "}
                    <span className={isFullPay ? "text-green-400" : "text-amber-400"}>
                      {isFullPay ? "✅ Complet" : `⚠️ Partiel`}
                    </span>
                  </p>
                </div>
              )}

              {/* Action Secondaire : Relance WhatsApp */}
              {(statut.status === "retard" || statut.status === "attente" || statut.status === "partiel") && quickPayPlayer.telephone_parent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prenomNom = `${quickPayPlayer.prenom} ${quickPayPlayer.nom_pere ? quickPayPlayer.nom_pere + " " : ""}${quickPayPlayer.nom}`;
                    const msg = statut.status === "retard" 
                      ? `⚠️ Bonjour, la Fiveur Academy vous informe que le paiement mensuel de ${quickPayPlayer.tarif_total} MRU pour ${prenomNom} est EN RETARD. La deadline du ${tarifs.jourLimitePaiement} est passée. Merci de régulariser.\n\nContact : Fiveur Academy.`
                      : `Bonjour, ceci est un rappel de la Fiveur Academy. Le paiement mensuel de ${quickPayPlayer.tarif_total} MRU pour ${prenomNom} est en attente. Date limite : le ${tarifs.jourLimitePaiement} du mois. Merci de régulariser.\n\nCordialement, Fiveur Academy.`;
                    const phone = formatPhone(quickPayPlayer.telephone_parent);
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 py-3 text-xs font-bold uppercase tracking-wide text-green-400 transition-all hover:bg-green-500/20"
                >
                  <MessageCircle className="h-4 w-4" /> Envoyer un rappel WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ====== FULL MODAL (Fiche Joueur) ====== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/80">
          <div className="relative flex w-full max-w-4xl max-h-[95vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
                {editingId ? "📝 Fiche Joueur" : "✨ Nouvelle Inscription"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"><XIcon className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                
                {/* Left Column - Photo & Identity */}
                <div className="md:col-span-4 flex flex-col gap-6">
                  <div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <div className="relative mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] border border-white/10 shadow-inner">
                      {form.photo_url ? <Image src={form.photo_url} alt="Photo" fill className="object-cover" /> : <Camera className="h-10 w-10 text-white/20" />}
                    </div>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingObj} className="text-xs font-bold uppercase tracking-wide text-fiver-green hover:opacity-80">
                      {uploadingObj ? "Chargement..." : form.photo_url ? "Changer la photo" : "Ajouter une photo"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Nom <span className="text-red-400">*</span></label>
                      <input value={form.nom} onChange={e => handleFormChange({ nom: e.target.value.toUpperCase() })} className={inputClass} placeholder="Ex: DIALLO" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Prénom de l'enfant <span className="text-red-400">*</span></label>
                      <input value={form.prenom} onChange={e => handleFormChange({ prenom: e.target.value })} className={inputClass} placeholder="Ex: Youssouf" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Prénom du père</label>
                      <input value={form.nom_pere || ""} onChange={e => handleFormChange({ nom_pere: e.target.value || null })} className={inputClass} placeholder="Ex: Oumar" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Sexe</label>
                        <select value={form.sexe} onChange={e => handleFormChange({ sexe: e.target.value })} className={inputClass}>
                          <option value="M" className="bg-[#1a1a1a]">Garçon</option>
                          <option value="F" className="bg-[#1a1a1a]">Fille</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Né(e) le</label>
                        <input type="date" value={form.date_naissance || ""} onChange={e => handleFormChange({ date_naissance: e.target.value || null })} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-8 flex flex-col gap-8">
                  {/* Prestations */}
                  <div>
                    <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><div className="h-px flex-1 bg-white/10"/>PRESTATIONS<div className="h-px flex-1 bg-white/10"/></h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <label className={cn("flex cursor-pointer items-center rounded-lg border p-4 transition-colors", form.football ? "border-fiver-green bg-fiver-green/5" : "border-white/10 bg-white/[0.02] hover:border-white/20")}>
                        <input type="checkbox" checked={form.football} onChange={e => handleFormChange({ football: e.target.checked })} className="h-5 w-5 accent-fiver-green cursor-pointer mr-3" />
                        <span className="font-bold text-white">⚽ Football Academy</span>
                      </label>
                      <label className={cn("flex cursor-pointer items-center rounded-lg border p-4 transition-colors", form.centre_loisirs ? "border-fiver-green bg-fiver-green/5" : "border-white/10 bg-white/[0.02] hover:border-white/20")}>
                        <input type="checkbox" checked={form.centre_loisirs} onChange={e => handleFormChange({ centre_loisirs: e.target.checked })} className="h-5 w-5 accent-fiver-green cursor-pointer mr-3" />
                        <span className="font-bold text-white">🎯 Centre de Loisirs</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Catégorie</label>
                        <select value={form.categorie_foot || ""} onChange={e => handleFormChange({ categorie_foot: e.target.value || null })} className={cn(inputClass, "font-bold text-fiver-green")}>
                          <option value="" className="bg-[#1a1a1a]">Sélectionner...</option>
                          {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Tarif Mensuel (Auto)</label>
                        <div className="flex h-[42px] w-full items-center rounded-md border border-white/5 bg-white/5 px-4 font-mono text-lg font-bold text-white">{form.tarif_total} MRU</div>
                      </div>
                    </div>
                  </div>

                  {/* Frais d'inscription (new) */}
                  {!editingId && (
                    <div>
                      <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-amber-400/50 flex items-center gap-2"><div className="h-px flex-1 bg-amber-400/10"/>PREMIÈRE INSCRIPTION<div className="h-px flex-1 bg-amber-400/10"/></h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-2">🎟️ Frais d'inscription</p>
                          <p className="font-mono text-xl font-bold text-white">{form.frais_inscription} MRU</p>
                          <label className="mt-3 flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.frais_inscription_paye} onChange={e => handleFormChange({ frais_inscription_paye: e.target.checked })} className="h-4 w-4 accent-fiver-green" />
                            <span className="text-xs text-white/60">Déjà payés</span>
                          </label>
                        </div>
                        {isFinDeMois && (
                          <div className={cn("rounded-lg border p-4", form.inscription_fin_de_mois ? "border-blue-500/30 bg-blue-500/10" : "border-white/5 bg-white/[0.02]")}>
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-400 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fin de mois</p>
                            <p className="text-[11px] text-white/50 mb-3">Après le {tarifs.seuilFinDeMois} → 1er paiement reporté.</p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={form.inscription_fin_de_mois} onChange={e => handleFormChange({ inscription_fin_de_mois: e.target.checked })} className="h-4 w-4 accent-blue-500" />
                              <span className="text-xs font-bold text-white">Reporter le 1er paiement</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Frais d'inscription (edit) */}
                  {editingId && (
                    <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                      <p className="text-xs text-white/50 flex-1">Frais insc. : <strong className="text-white">{form.frais_inscription} MRU</strong></p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.frais_inscription_paye} onChange={e => handleFormChange({ frais_inscription_paye: e.target.checked })} className="h-5 w-5 accent-fiver-green" />
                        <span className={cn("text-sm font-bold", form.frais_inscription_paye ? "text-green-400" : "text-red-400")}>{form.frais_inscription_paye ? "✅ Payés" : "❌ Non payés"}</span>
                      </label>
                    </div>
                  )}

                  {/* Contact */}
                  <div>
                    <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><div className="h-px flex-1 bg-white/10"/>CONTACT<div className="h-px flex-1 bg-white/10"/></h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Téléphone Parent</label>
                        <input value={form.telephone_parent || ""} onChange={e => handleFormChange({ telephone_parent: e.target.value || null })} placeholder="Ex: +222 4X XX XX XX" className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Adresse</label>
                        <input value={form.adresse || ""} onChange={e => handleFormChange({ adresse: e.target.value || null })} placeholder="Ex: Cité Plage" className={inputClass} />
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Observations</label>
                    <textarea rows={2} value={form.observations || ""} onChange={e => handleFormChange({ observations: e.target.value || null })} className={cn(inputClass, "resize-none")} placeholder="Notes..." />
                  </div>

                  {/* Total résumé (new only) */}
                  {!editingId && (
                    <div className="rounded-xl border border-fiver-green/20 bg-fiver-green/5 p-5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-fiver-green mb-3">💰 Récapitulatif</h4>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between"><span className="text-white/50">Tarif mensuel</span><span className="text-white font-medium">{form.tarif_total} MRU</span></div>
                        {!form.frais_inscription_paye && <div className="flex justify-between"><span className="text-white/50">Frais d'inscription</span><span className="text-amber-400 font-medium">+ {form.frais_inscription} MRU</span></div>}
                        {form.inscription_fin_de_mois && <div className="flex justify-between"><span className="text-white/50">1er mois</span><span className="text-blue-400 font-medium">Offert (fin de mois)</span></div>}
                        <hr className="my-1 border-fiver-green/20" />
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-fiver-green">TOTAL DÛ</span>
                          <span className="text-fiver-green font-mono">
                            {form.inscription_fin_de_mois ? (form.frais_inscription_paye ? 0 : form.frais_inscription) : totalDuNow} MRU
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-white/5 bg-[#0a0a0a] px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-md px-5 py-2.5 text-sm font-medium text-white/50 hover:text-white">Annuler</button>
              <button onClick={saveReg} disabled={!form.nom||!form.prenom} className="flex items-center gap-2 rounded-md bg-fiver-green px-6 py-2.5 text-sm font-bold tracking-wide text-fiver-black shadow-lg shadow-fiver-green/20 transition-all hover:scale-105 disabled:opacity-50">
                <Save className="h-4 w-4" /> {editingId ? "Enregistrer" : "Créer l'inscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
