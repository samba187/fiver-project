"use client";

import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import { Plus, Search, X as XIcon, Save, Camera, CreditCard, AlertTriangle, Zap, Pencil, MessageCircle, Printer, Loader2, CheckSquare, Square, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import type { Registration, Tarifs } from "./page";

const inputClass = "w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green transition-colors";
const CATEGORIES = ["U5", "U7", "U9", "U11", "U12F", "U13", "U15", "U15F"];
const MOYENS_PAIEMENT = ["Bankily", "Masrvi", "Cash", "Autre"];

const ALL_MONTHS = [
  { val: "01", label: "Jan" }, { val: "02", label: "Fév" }, { val: "03", label: "Mar" },
  { val: "04", label: "Avr" }, { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juil" }, { val: "08", label: "Août" }, { val: "09", label: "Sep" },
  { val: "10", label: "Oct" }, { val: "11", label: "Nov" }, { val: "12", label: "Déc" },
];

function calcAge(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000);
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

function getMonthStatus(r: Registration, monthStr: string): "paye" | "partiel" | "non_paye" {
  const history = r.academy_payments_history || [];
  const payments = history.filter(h => h.mois_concerne === monthStr);
  if (payments.length === 0) return "non_paye";

  const totalPaid = payments.reduce((acc, h) => acc + h.montant, 0);
  if (totalPaid > 0 && totalPaid >= r.tarif_total) return "paye";
  if (totalPaid > 0) return "partiel";
  return "paye"; // Si paiement validé à 0 (ex: exception manuelle)
}

export function getStatutMoisEnCours(r: Registration, jourLimite: number): { label: string; cls: string; badgeCls: string; status: "ok" | "attente" | "retard" | "partiel" | "offert" } {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = now.getDate();

  if (r.inscription_fin_de_mois && r.created_at) {
    const createdDate = new Date(r.created_at);
    if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) {
      return { label: "🆕 Mois offert", cls: "text-blue-400 font-medium", badgeCls: "bg-blue-500/10 text-blue-400", status: "offert" };
    }
  }

  const history = r.academy_payments_history || [];
  const paymentsThisMonth = history.filter(h => h.mois_concerne === currentMonth);
  const totalPaid = paymentsThisMonth.reduce((acc, h) => acc + h.montant, 0);

  if (totalPaid >= r.tarif_total) return { label: "✅ À jour", cls: "text-green-400 font-medium", badgeCls: "bg-green-500/10 text-green-400", status: "ok" };
  if (totalPaid > 0) return { label: `🟡 Partiel (${totalPaid}/${r.tarif_total})`, cls: "text-amber-400", badgeCls: "bg-amber-500/10 text-amber-400", status: "partiel" };
  if (dayOfMonth <= jourLimite) return { label: `🟡 J-${jourLimite - dayOfMonth}`, cls: "text-amber-400", badgeCls: "bg-amber-500/10 text-amber-400", status: "attente" };

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
  const [quickPayTarget, setQuickPayTarget] = useState<{ type: "month" | "frais"; monthStr?: string } | null>(null);
  const [quickPayMontant, setQuickPayMontant] = useState(0);
  const [quickPayMoyen, setQuickPayMoyen] = useState("Cash");
  const [quickPayDate, setQuickPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [quickPaySaving, setQuickPaySaving] = useState(false);

  // Invoice Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceStep, setInvoiceStep] = useState<"select" | "preview">("select");
  const [invoicePlayer, setInvoicePlayer] = useState<Registration | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<{ id: string, label: string, amount: number, selected: boolean, isFrais: boolean, method: string, date: string }[]>([]);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

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
        } else if (next.football) {
          next.tarif_total = tarifs.tarifFoot;
        } else if (next.centre_loisirs) {
          next.tarif_total = tarifs.tarifLoisirs;
        } else {
          next.tarif_total = 0;
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
    const { id, created_at, academy_payments_history, ...rest } = r as any;
    setForm(rest);
    setModalOpen(true);
  }

  async function saveReg() {
    if (!form.nom || !form.prenom) return;
    const payload = { ...form, date_naissance: form.date_naissance || null };
    if (editingId) {
      await supabase.from("academy_registrations").update(payload).eq("id", editingId);
    } else {
      await supabase.from("academy_registrations").insert(payload);
    }
    setModalOpen(false);
    onRefresh();
  }

  // ====== QUICK PAYMENT LOGIC ======
  function openQuickPayMonth(r: Registration, monthStr: string) {
    const status = getMonthStatus(r, monthStr);
    const history = r.academy_payments_history || [];
    const totalPaid = history.filter(h => h.mois_concerne === monthStr).reduce((acc, h) => acc + h.montant, 0);
    const remaining = r.tarif_total - totalPaid;

    setQuickPayTarget({ type: "month", monthStr });
    setQuickPayPlayer(r);
    setQuickPayMontant(remaining > 0 ? remaining : r.tarif_total);
    setQuickPayMoyen("Cash");
    setQuickPayDate(new Date().toISOString().split("T")[0]);
    setQuickPayOpen(true);
  }

  function openQuickPayFrais(r: Registration) {
    if (r.frais_inscription_paye) return;
    setQuickPayTarget({ type: "frais" });
    setQuickPayPlayer(r);
    setQuickPayMontant(r.frais_inscription);
    setQuickPayMoyen("Cash");
    setQuickPayDate(new Date().toISOString().split("T")[0]);
    setQuickPayOpen(true);
  }

  async function submitQuickPay() {
    if (!quickPayPlayer || !quickPayTarget) return;
    setQuickPaySaving(true);

    if (quickPayTarget.type === "month") {
      await supabase.from("academy_payments_history").insert({
        registration_id: quickPayPlayer.id,
        mois_concerne: quickPayTarget.monthStr,
        montant: quickPayMontant,
        moyen_paiement: quickPayMoyen || "Cash",
        description: "Mensualité",
        date_paiement: new Date(quickPayDate + "T12:00:00Z").toISOString()
      });
      // Legacy compat for current month
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      if (quickPayTarget.monthStr === currentMonth) {
        await supabase.from("academy_registrations").update({
          montant_paye: quickPayMontant,
          date_paiement: quickPayDate,
          statut_paiement: "paye"
        }).eq("id", quickPayPlayer.id);
      }
    } else if (quickPayTarget.type === "frais") {
      await supabase.from("academy_registrations").update({ frais_inscription_paye: true }).eq("id", quickPayPlayer.id);
      await supabase.from("academy_payments_history").insert({
        registration_id: quickPayPlayer.id,
        mois_concerne: "FRAIS",
        montant: quickPayMontant,
        moyen_paiement: quickPayMoyen || "Cash",
        description: "Frais d'inscription",
        date_paiement: new Date(quickPayDate + "T12:00:00Z").toISOString()
      });
    }

    setQuickPaySaving(false);
    setQuickPayOpen(false);
    setQuickPayPlayer(null);
    onRefresh();
  }

  async function cancelQuickPay() {
    if (!quickPayPlayer || !quickPayTarget) return;
    if (!confirm("Voulez-vous vraiment annuler le paiement pour ce mois ?")) return;
    setQuickPaySaving(true);
    
    if (quickPayTarget.type === "month") {
      await supabase.from("academy_payments_history")
        .delete()
        .eq("registration_id", quickPayPlayer.id)
        .eq("mois_concerne", quickPayTarget.monthStr);
    }
    
    setQuickPaySaving(false);
    setQuickPayOpen(false);
    onRefresh();
  }

  // ====== INVOICE LOGIC ======
  function openInvoiceModal(r: Registration) {
    setInvoicePlayer(r);
    const history = r.academy_payments_history || [];
    const items: typeof invoiceItems = [];

    // Frais
    if (r.frais_inscription_paye) {
      const fraisP = history.find(h => h.mois_concerne === "FRAIS");
      items.push({
        id: "FRAIS",
        label: "Frais d'inscription",
        amount: r.frais_inscription,
        selected: false,
        isFrais: true,
        method: fraisP?.moyen_paiement || "Cash",
        date: fraisP?.date_paiement || String(r.created_at)
      });
    }

    // Group history by month
    const monthMap = new Map<string, { amount: number, method: string, date: string }>();
    history.forEach(h => {
      if (h.mois_concerne !== "FRAIS") {
        const existing = monthMap.get(h.mois_concerne);
        if (existing) {
          existing.amount += h.montant;
          if (new Date(h.date_paiement) > new Date(existing.date)) {
            existing.method = h.moyen_paiement || "Cash";
            existing.date = h.date_paiement;
          }
        } else {
          monthMap.set(h.mois_concerne, { amount: h.montant, method: h.moyen_paiement || "Cash", date: h.date_paiement });
        }
      }
    });

    monthMap.forEach((data, monthStr) => {
      const [y, m] = monthStr.split("-");
      const monthLabel = ALL_MONTHS.find(x => x.val === m)?.label || m;
      items.push({
        id: monthStr,
        label: `Mois : ${monthLabel} ${y}`,
        amount: data.amount,
        selected: false,
        isFrais: false,
        method: data.method,
        date: data.date
      });
    });

    setInvoiceItems(items.sort((a, b) => a.id.localeCompare(b.id)));
    setInvoiceStep("select");
    setInvoiceModalOpen(true);
  }

  function toggleInvoiceItem(id: string) {
    setInvoiceItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function formatDateSafely(dateStr: string | null | undefined) {
    if (!dateStr || dateStr === "null" || dateStr === "undefined") return "Date inconnue";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Date inconnue" : d.toLocaleDateString("fr-FR");
  }

  const renderReceiptContent = () => {
    if (!invoicePlayer) return null;
    const totalAmount = invoiceItems.filter(i => i.selected).reduce((acc, curr) => acc + curr.amount, 0);

    return (
      <div style={{ width: "100%", maxWidth: "600px", background: "white", padding: "40px", color: "#1a1a1a", position: "relative", margin: "0 auto", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.05, pointerEvents: "none", zIndex: 0 }}>
          <img src="/images/fiveur-academy-logo.png" alt="Watermark" style={{ width: 320, height: "auto" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 24, position: "relative", zIndex: 10 }}>
          <img src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" style={{ height: 60, display: "inline-block" }} />
        </div>

        <div style={{ marginBottom: 24, position: "relative", zIndex: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#2d6a2e", textTransform: "uppercase", margin: 0 }}>FIVEUR ACADEMY</h1>
          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0 0" }}>Since 2026 — Nouakchott, Mauritanie</p>
        </div>

        <div style={{ marginBottom: 20, position: "relative", zIndex: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px 0", color: "#111" }}>REÇU DE PAIEMENT</h2>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span><strong>Reçu N° :</strong> REC-{String(invoicePlayer.id).padStart(4, "0")}</span>
            <span><strong>Date :</strong> {formatDateSafely(new Date().toISOString())}</span>
          </div>
        </div>

        <div style={{ background: "#2d6a2e", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>INFORMATIONS DE L'INSCRIT</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginBottom: 32 }}>
          <div style={{ flex: 1, paddingRight: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Nom et Prénom :</span>
              <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{invoicePlayer.prenom} {invoicePlayer.nom}</span>
            </div>
            {invoicePlayer.date_naissance && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
                <span style={{ color: "#666" }}>Date de naissance :</span>
                <span style={{ fontWeight: 700 }}>{formatDateSafely(invoicePlayer.date_naissance)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Tél. parent :</span>
              <span style={{ fontWeight: 700 }}>{invoicePlayer.telephone_parent}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Prestation(s) :</span>
              <span style={{ fontWeight: 700 }}>
                {invoicePlayer.football && `⚽ Football Academy${invoicePlayer.categorie_foot ? ` (${invoicePlayer.categorie_foot})` : ''}`}
                {invoicePlayer.football && invoicePlayer.centre_loisirs && " + "}
                {invoicePlayer.centre_loisirs && "🎨 Centre Loisirs"}
              </span>
            </div>
          </div>
          <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "2px solid #2d6a2e", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", flexShrink: 0 }}>
            {invoicePlayer.photo_url ? (
              <img src={invoicePlayer.photo_url} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            ) : (
              <span style={{ color: "#999", fontSize: 24, fontWeight: "bold" }}>{invoicePlayer.prenom.charAt(0)}</span>
            )}
          </div>
        </div>

        <div style={{ background: "#2d6a2e", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>DÉTAIL DES PAIEMENTS</div>

        <div style={{ position: "relative", zIndex: 10, marginBottom: 24 }}>
          {invoiceItems.filter(i => i.selected).map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "#333", fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{item.method.toUpperCase()}</span>
                  <span>•</span>
                  <span>Réglé le {item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "N/A"}</span>
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{item.amount} MRU</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#f0fdf0", border: "1px solid #2d6a2e", padding: "24px 20px", textAlign: "center", margin: "32px 0 16px 0", borderRadius: 8, position: "relative", zIndex: 10 }}>
          <p style={{ fontSize: 13, color: "#666", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, margin: "0 0 8px 0" }}>MONTANT TOTAL PAYÉ</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: "#2d6a2e", margin: 0 }}>{totalAmount} MRU</p>
          <div style={{ marginTop: 16 }}>
            <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 20, fontWeight: 800, fontSize: 14, background: "#dcfce7", color: "#166534" }}>
              ✅ Paiement Confirmé
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 10, color: "#999", borderTop: "1px solid #eee", paddingTop: 16, position: "relative", zIndex: 10 }}>
          Ce document est généré de manière automatique et électronique, il tient lieu de preuve de paiement certifiée.<br />
          <strong>Fiveur Academy</strong>
        </div>
      </div>
    );
  };

  async function generateMultiInvoice() {
    if (!invoicePlayer) return;
    const selected = invoiceItems.filter(i => i.selected);
    if (selected.length === 0) return;

    setIsGeneratingInvoice(true);

    setTimeout(async () => {
      try {
        if (!receiptRef.current) throw new Error("Receipt ref not found");

        const imgData = await htmlToImage.toPng(receiptRef.current, { pixelRatio: 2, skipAutoScale: true });
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let imgWidthRender = pdfWidth;

        if (imgHeight > pdfPageHeight) {
          const ratio = pdfPageHeight / imgHeight;
          imgHeight = pdfPageHeight;
          imgWidthRender = imgWidthRender * ratio;
        }

        const xOffset = (pdfWidth - imgWidthRender) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 0, imgWidthRender, imgHeight);

        const pdfBlob = pdf.output("blob");
        const fileName = `recu-academy-${invoicePlayer.id}-${Date.now()}.pdf`;

        const { error: uploadError } = await supabase.storage.from("academy_receipts").upload(fileName, pdfBlob, { contentType: "application/pdf" });

        let pdfUrlLine = "";
        if (!uploadError) {
          const { data } = supabase.storage.from("academy_receipts").getPublicUrl(fileName);
          let finalUrl = data.publicUrl;
          try {
            const shortRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(finalUrl)}`);
            if (shortRes.ok) finalUrl = await shortRes.text();
          } catch (e) { console.warn("Erreur raccourcissement URL", e); }
          pdfUrlLine = finalUrl;
        }

        const totalAmount = selected.reduce((acc, curr) => acc + curr.amount, 0);
        const labelsList = selected.map(i => `- ${i.label}`).join("\n");
        const prenomNom = `${invoicePlayer.prenom} ${invoicePlayer.nom_pere ? invoicePlayer.nom_pere + " " : ""}${invoicePlayer.nom}`;

        const msg = `=========================
FIVEUR ACADEMY
=========================
Facture / Reçu

N° : REC-${String(invoicePlayer.id).padStart(4, "0")}
Joueur : ${prenomNom}
Éléments facturés :
${labelsList}

Montant Total : ${totalAmount} MRU
Statut : [Payé]
Date : ${new Date().toLocaleDateString("fr-FR")}
${pdfUrlLine ? `\nLien vers votre reçu PDF :\n${pdfUrlLine.replace('\n', '')}` : ""}

Merci de votre confiance !`;

        let phone = formatPhone(invoicePlayer.telephone_parent);
        if (phone.length === 8) phone = "222" + phone;
        
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.location.href = waUrl;
      } catch (err) {
        console.error("Erreur génération PDF:", err);
        alert("Une erreur est survenue lors de la génération du PDF.");
      } finally {
        setIsGeneratingInvoice(false);
        setInvoiceModalOpen(false);
      }
    }, 100);
  }

  async function downloadInvoice() {
    setIsGeneratingInvoice(true);
    setTimeout(async () => {
      try {
        if (!receiptRef.current) throw new Error("Receipt ref not found");
        const imgData = await htmlToImage.toPng(receiptRef.current, { pixelRatio: 2, skipAutoScale: true });
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let imgWidthRender = pdfWidth;

        if (imgHeight > pdfPageHeight) {
          const ratio = pdfPageHeight / imgHeight;
          imgHeight = pdfPageHeight;
          imgWidthRender = imgWidthRender * ratio;
        }

        const xOffset = (pdfWidth - imgWidthRender) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 0, imgWidthRender, imgHeight);

        pdf.save(`Facture_Academy_${invoicePlayer?.prenom}_${invoicePlayer?.nom}.pdf`);
      } catch (err) {
        console.error("Erreur téléchargement PDF:", err);
        alert("Une erreur est survenue lors du téléchargement.");
      } finally {
        setIsGeneratingInvoice(false);
        setInvoiceModalOpen(false);
      }
    }, 100);
  }

  const currentYear = new Date().getFullYear();

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
          <button onClick={openAdd} className="flex items-center gap-2 rounded-sm bg-fiver-green px-4 py-2.5 text-xs font-semibold uppercase text-fiver-black hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Inscrire
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/40">{filtered.length} inscrit(s)</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#121212] shadow-xl">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-white/40">
              <th className="px-3 py-4 w-12"></th>
              <th className="px-3 py-4">Nom Complet</th>
              <th className="px-3 py-4">Âge</th>
              <th className="px-3 py-4">Cat.</th>
              <th className="px-3 py-4">Tarif</th>
              <th className="px-3 py-4 min-w-[340px]">Paiements (Saison {currentYear})</th>
              <th className="px-3 py-4 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const age = calcAge(r.date_naissance);
              return (
                <tr key={r.id} className={cn("group border-b border-white/5 transition-all hover:bg-white/[0.04]")}>
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
                    <p className="text-sm font-bold text-white transition-colors">
                      {r.prenom} {r.nom_pere ? r.nom_pere + " " : ""}{r.nom}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">{r.telephone_parent || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50">{age ? `${age}a` : "—"}</td>
                  <td className="px-3 py-3">
                    {r.categorie_foot ? <span className="rounded bg-fiver-green/10 px-2 py-0.5 text-[10px] font-bold text-fiver-green">{r.categorie_foot}</span> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-3 py-3 text-sm font-mono font-bold text-white/70">{r.tarif_total.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openQuickPayFrais(r); }}
                        className={cn("h-6 px-2 text-[9px] font-bold rounded uppercase transition-all", r.frais_inscription_paye ? "bg-green-500/20 text-green-400 cursor-default" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]")}
                        title="Frais d'inscription"
                      >
                        FRAIS {r.frais_inscription_paye ? "✓" : ""}
                      </button>
                      <div className="mx-1 h-4 w-px bg-white/10" />
                      {ALL_MONTHS.map(m => {
                        const monthStr = `${currentYear}-${m.val}`;
                        const status = getMonthStatus(r, monthStr);
                        const colors = {
                          paye: "bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.4)] hover:brightness-110",
                          partiel: "bg-amber-500 text-black hover:brightness-110",
                          non_paye: "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
                        };
                        return (
                          <button
                            key={m.val}
                            onClick={(e) => { e.stopPropagation(); openQuickPayMonth(r, monthStr); }}
                            className={cn("h-6 w-8 text-[9px] font-bold rounded flex items-center justify-center transition-all", colors[status])}
                            title={`${m.label} ${currentYear}`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                      
                      {(() => {
                        const history = (r.academy_payments_history || []).filter(h => h.mois_concerne !== "FRAIS");
                        if (history.length === 0) return null;
                        const sorted = [...history].sort((a, b) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime());
                        const lastPaymentDate = sorted[0].date_paiement;
                        return (
                          <div className="ml-2 pl-2 border-l border-white/10 text-[10px] text-white/40 flex items-center gap-1" title="Dernier encaissement (Mensualité)">
                            <Calendar className="h-3 w-3" />
                            {new Date(lastPaymentDate).toLocaleDateString("fr-FR")}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openInvoiceModal(r); }}
                        className="rounded-md p-1.5 text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                        title="Générer Facture WhatsApp"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        className="rounded-md p-1.5 text-white/20 hover:bg-white/5 hover:text-white/60 transition-colors"
                        title="Modifier la fiche"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ====== QUICK PAYMENT MODAL ====== */}
      {quickPayOpen && quickPayPlayer && quickPayTarget && (() => {
        const title = quickPayTarget.type === "month"
          ? `Paiement — ${ALL_MONTHS.find(m => m.val === quickPayTarget.monthStr?.split("-")[1])?.label} ${quickPayTarget.monthStr?.split("-")[0]}`
          : "Frais d'inscription";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200" onClick={() => setQuickPayOpen(false)}>
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/5 p-5">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={() => setQuickPayOpen(false)} className="text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-[#1a1a1a] flex items-center justify-center">
                    {quickPayPlayer.photo_url ? <Image src={quickPayPlayer.photo_url} alt="" fill className="object-cover" /> : <span className="text-xs text-white/30">{quickPayPlayer.prenom.charAt(0)}{quickPayPlayer.nom.charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{quickPayPlayer.prenom} {quickPayPlayer.nom}</p>
                    <p className="text-xs text-white/40">{quickPayPlayer.categorie_foot}</p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/40">Montant encaissé (MRU)</label>
                  <input
                    type="number"
                    value={quickPayMontant}
                    onChange={e => setQuickPayMontant(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border-2 border-white/10 bg-[#0f0f0f] px-4 py-3 text-center font-mono text-2xl font-black text-fiver-green focus:border-fiver-green focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/40">Moyen de paiement</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MOYENS_PAIEMENT.map(m => (
                      <button key={m} onClick={() => setQuickPayMoyen(m)}
                        className={cn("rounded-lg border p-2 text-xs font-bold transition-all", quickPayMoyen === m ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10")}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/40">Date d'encaissement</label>
                  <input
                    type="date"
                    value={quickPayDate}
                    onChange={e => setQuickPayDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-white/10 bg-[#0f0f0f] px-4 py-3 text-center font-mono font-bold text-white focus:border-fiver-green focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={submitQuickPay}
                    disabled={quickPaySaving || quickPayMontant < 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-fiver-green py-3 text-sm font-black text-black shadow-lg shadow-fiver-green/20 disabled:opacity-50"
                  >
                    {quickPaySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider l'encaissement"}
                  </button>
                  
                  {quickPayTarget.type === "month" && (quickPayPlayer.academy_payments_history || []).some(h => h.mois_concerne === quickPayTarget.monthStr) && (
                    <button
                      onClick={cancelQuickPay}
                      disabled={quickPaySaving}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-400 py-3 text-sm font-bold border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                    >
                      Annuler le paiement
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ====== INVOICE GENERATOR MODAL ====== */}
      {invoiceModalOpen && invoicePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200" onClick={() => setInvoiceModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111] shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="h-5 w-5 text-fiver-green" />
                {invoiceStep === "select" ? "Générer une Facture" : "Aperçu de la Facture"}
              </h3>
              <button onClick={() => setInvoiceModalOpen(false)} className="text-white/30 hover:text-white"><XIcon className="h-5 w-5" /></button>
            </div>

            {invoiceStep === "select" ? (
              <>
                <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
                  <p className="text-sm text-white/60 mb-4">Sélectionnez les paiements effectués par <strong className="text-white">{invoicePlayer.prenom} {invoicePlayer.nom}</strong> à inclure dans la facture :</p>

                  {invoiceItems.length === 0 ? (
                    <div className="text-center p-6 border border-white/5 rounded-lg bg-white/[0.02]">
                      <p className="text-white/40 text-sm">Aucun paiement enregistré pour cet enfant.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoiceItems.map(item => (
                        <div key={item.id} onClick={() => toggleInvoiceItem(item.id)} className={cn("flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all", item.selected ? "border-fiver-green bg-fiver-green/5" : "border-white/5 bg-white/[0.02] hover:bg-white/5")}>
                          <div className="flex items-center gap-3">
                            <button className={cn("text-xl transition-colors", item.selected ? "text-fiver-green" : "text-white/20")}>
                              {item.selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                            </button>
                            <span className={cn("font-bold text-sm", item.selected ? "text-white" : "text-white/60")}>{item.label}</span>
                          </div>
                          <span className="font-mono text-sm font-bold text-white/80">{item.amount} MRU</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 p-5 bg-[#0a0a0a]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase tracking-wider text-white/40 font-bold">Total Sélectionné</span>
                    <span className="text-xl font-black text-fiver-green font-mono">{invoiceItems.filter(i => i.selected).reduce((acc, curr) => acc + curr.amount, 0)} MRU</span>
                  </div>
                  <button
                    onClick={() => setInvoiceStep("preview")}
                    disabled={invoiceItems.filter(i => i.selected).length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-black text-black shadow-lg shadow-[#25D366]/20 disabled:opacity-50"
                  >
                    Voir l'aperçu
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-200">
                  <div className="shadow-xl rounded-md overflow-hidden">
                    {renderReceiptContent()}
                  </div>
                </div>

                <div className="border-t border-white/5 p-5 bg-[#0a0a0a] flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setInvoiceStep("select")}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all"
                  >
                    Retour
                  </button>
                  <button
                    onClick={downloadInvoice}
                    disabled={isGeneratingInvoice}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all"
                  >
                    <Printer className="h-4 w-4" /> Imprimer / Télécharger
                  </button>
                  <button
                    onClick={generateMultiInvoice}
                    disabled={isGeneratingInvoice}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-black text-black shadow-lg shadow-[#25D366]/20 disabled:opacity-50 hover:brightness-110 transition-all"
                  >
                    {isGeneratingInvoice ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MessageCircle className="h-5 w-5" /> WhatsApp</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden Receipt for PDF Generation */}
      {invoicePlayer && invoiceItems.filter(i => i.selected).length > 0 && (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px", zIndex: -100 }}>
          <div ref={receiptRef} style={{ width: "600px" }}>
            {renderReceiptContent()}
          </div>
        </div>
      )}

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
                    <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><div className="h-px flex-1 bg-white/10" />PRESTATIONS<div className="h-px flex-1 bg-white/10" /></h4>
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

                  {/* Contact */}
                  <div>
                    <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2"><div className="h-px flex-1 bg-white/10" />CONTACT<div className="h-px flex-1 bg-white/10" /></h4>
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
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-white/5 bg-[#0a0a0a] px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-md px-5 py-2.5 text-sm font-medium text-white/50 hover:text-white">Annuler</button>
              <button onClick={saveReg} disabled={!form.nom || !form.prenom} className="flex items-center gap-2 rounded-md bg-fiver-green px-6 py-2.5 text-sm font-bold tracking-wide text-fiver-black shadow-lg shadow-fiver-green/20 transition-all hover:scale-105 disabled:opacity-50">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
