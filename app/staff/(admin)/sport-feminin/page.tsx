"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Heart, Check, X, Phone, Trash2, Calendar, Printer, MessageCircle, AlertTriangle, Zap, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";

const ALL_MONTHS = [
  { val: "01", label: "Jan" }, { val: "02", label: "Fév" }, { val: "03", label: "Mar" },
  { val: "04", label: "Avr" }, { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juil" }, { val: "08", label: "Août" }, { val: "09", label: "Sep" },
  { val: "10", label: "Oct" }, { val: "11", label: "Nov" }, { val: "12", label: "Déc" },
];

interface PaymentHistory {
  id: number;
  inscription_id: number;
  mois_concerne: string;
  montant: number;
  moyen_paiement: string;
  created_at: string;
}

interface Inscription {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  telephone: string;
  enfant_inscrit: boolean;
  enfant_nom_prenom?: string;
  statut: string;
  created_at: string;
  sport_feminin_payments_history?: PaymentHistory[];
}

function formatDateSafely(dateStr: string | null | undefined) {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return "Date inconnue";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "Date inconnue" : d.toLocaleDateString("fr-FR");
}

function getMonthStatus(r: Inscription, monthStr: string): "paye" | "partiel" | "non_paye" {
  const history = r.sport_feminin_payments_history || [];
  const payments = history.filter(h => h.mois_concerne === monthStr);
  if (payments.length === 0) return "non_paye";

  const totalPaid = payments.reduce((acc, h) => acc + h.montant, 0);
  const tarifTotal = r.enfant_inscrit ? 800 : 1000;
  if (totalPaid > 0 && totalPaid >= tarifTotal) return "paye";
  if (totalPaid > 0) return "partiel";
  return "paye";
}

export default function SportFemininAdminPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("tous");

  // Quick Payment mini-modal state
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [quickPayPlayer, setQuickPayPlayer] = useState<Inscription | null>(null);
  const [quickPayTarget, setQuickPayTarget] = useState<string | null>(null);
  const [quickPayMontant, setQuickPayMontant] = useState(0);
  const [quickPayMoyen, setQuickPayMoyen] = useState("Cash");
  const [quickPayDate, setQuickPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [quickPaySaving, setQuickPaySaving] = useState(false);

  // Invoice Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceStep, setInvoiceStep] = useState<"select" | "preview">("select");
  const [invoicePlayer, setInvoicePlayer] = useState<Inscription | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<{ id: string, label: string, amount: number, selected: boolean, method: string, date: string }[]>([]);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchInscriptions();
  }, []);

  async function fetchInscriptions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sport_feminin_inscriptions")
      .select("*, sport_feminin_payments_history(*)")
      .order("created_at", { ascending: false });
    
    if (data) setInscriptions(data as Inscription[]);
    setLoading(false);
  }

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from("sport_feminin_inscriptions")
      .update({ statut: newStatus })
      .eq("id", id);
    if (!error) fetchInscriptions();
  }

  async function deleteInscription(id: number) {
    if (!confirm("Voulez-vous vraiment supprimer cette inscription ?")) return;
    const { error } = await supabase
      .from("sport_feminin_inscriptions")
      .delete()
      .eq("id", id);
    if (!error) fetchInscriptions();
  }

  function openQuickPayMonth(r: Inscription, monthStr: string) {
    const history = r.sport_feminin_payments_history || [];
    const totalPaid = history.filter(h => h.mois_concerne === monthStr).reduce((acc, h) => acc + h.montant, 0);
    const tarifTotal = r.enfant_inscrit ? 800 : 1000;
    const remaining = tarifTotal - totalPaid;

    setQuickPayTarget(monthStr);
    setQuickPayPlayer(r);
    setQuickPayMontant(remaining > 0 ? remaining : tarifTotal);
    setQuickPayMoyen("Cash");
    setQuickPayDate(new Date().toISOString().split("T")[0]);
    setQuickPayOpen(true);
  }

  async function submitQuickPay() {
    if (!quickPayPlayer || !quickPayTarget) return;
    setQuickPaySaving(true);

    await supabase.from("sport_feminin_payments_history").insert({
      inscription_id: quickPayPlayer.id,
      mois_concerne: quickPayTarget,
      montant: quickPayMontant,
      moyen_paiement: quickPayMoyen || "Cash",
      description: "Abonnement Mensuel",
      created_at: new Date(quickPayDate + "T12:00:00Z").toISOString()
    });

    if (quickPayPlayer.statut === "en_attente") {
      await supabase.from("sport_feminin_inscriptions").update({ statut: "confirmé" }).eq("id", quickPayPlayer.id);
    }

    setQuickPaySaving(false);
    setQuickPayOpen(false);
    setQuickPayPlayer(null);
    fetchInscriptions();
  }

  async function cancelQuickPay() {
    if (!quickPayPlayer || !quickPayTarget) return;
    if (!confirm("Voulez-vous vraiment annuler le paiement pour ce mois ?")) return;
    setQuickPaySaving(true);
    
    await supabase.from("sport_feminin_payments_history")
      .delete()
      .eq("inscription_id", quickPayPlayer.id)
      .eq("mois_concerne", quickPayTarget);
      
    setQuickPaySaving(false);
    setQuickPayOpen(false);
    setQuickPayPlayer(null);
    fetchInscriptions();
  }

  function openInvoiceModal(r: Inscription) {
    setInvoicePlayer(r);
    const history = r.sport_feminin_payments_history || [];
    const items: typeof invoiceItems = [];
    
    const monthMap = new Map<string, { amount: number, method: string, date: string }>();
    history.forEach(h => {
      const existing = monthMap.get(h.mois_concerne);
      if (existing) {
        existing.amount += h.montant;
        if (new Date(h.created_at) > new Date(existing.date)) {
          existing.method = h.moyen_paiement || "Cash";
          existing.date = h.created_at;
        }
      } else {
        monthMap.set(h.mois_concerne, { amount: h.montant, method: h.moyen_paiement || "Cash", date: h.created_at });
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

  const renderReceiptContent = () => {
    if (!invoicePlayer) return null;
    const totalAmount = invoiceItems.filter(i => i.selected).reduce((acc, curr) => acc + curr.amount, 0);

    return (
      <div style={{ background: "white", width: "100%", maxWidth: "600px", padding: "40px", color: "#1a1a1a", position: "relative", margin: "0 auto", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.05, pointerEvents: "none", zIndex: 0 }}>
          <img src="/images/fiveur-academy-logo.png" alt="Watermark" style={{ width: 320, height: "auto" }} />
        </div>
        
        <div style={{ textAlign: "center", marginBottom: 24, position: "relative", zIndex: 10 }}>
          <img src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" style={{ height: 60, display: "inline-block" }} />
        </div>

        <div style={{ marginBottom: 24, position: "relative", zIndex: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#c81054", textTransform: "uppercase", margin: 0 }}>SPORT FÉMININ</h1>
          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0 0" }}>Fiveur Arena — Nouakchott, Mauritanie</p>
        </div>

        <div style={{ marginBottom: 20, position: "relative", zIndex: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px 0", color: "#111" }}>REÇU DE PAIEMENT</h2>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span><strong>Reçu N° :</strong> REC-SF-{String(invoicePlayer.id).padStart(4, "0")}</span>
            <span><strong>Date :</strong> {formatDateSafely(new Date().toISOString())}</span>
          </div>
        </div>
        
        <div style={{ background: "#c81054", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>INFORMATIONS DE L'INSCRITE</div>
        
        <div style={{ position: "relative", zIndex: 10, marginBottom: 32 }}>
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
            <span style={{ color: "#666" }}>Téléphone :</span>
            <span style={{ fontWeight: 700 }}>{invoicePlayer.telephone}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
            <span style={{ color: "#666" }}>Prestation :</span>
            <span style={{ fontWeight: 700 }}>Abonnement Mensuel</span>
          </div>
          {invoicePlayer.enfant_inscrit && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Enfant inscrit (Academy) :</span>
              <span style={{ fontWeight: 700 }}>{invoicePlayer.enfant_nom_prenom || "Oui"} (-20%)</span>
            </div>
          )}
        </div>
        
        <div style={{ background: "#c81054", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>DÉTAIL DES PAIEMENTS</div>
        
        <div style={{ position: "relative", zIndex: 10, marginBottom: 24 }}>
          {invoiceItems.filter(i => i.selected).map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "#333", fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: "#fdf2f8", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{item.method.toUpperCase()}</span>
                  <span>•</span>
                  <span>Réglé le {item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "N/A"}</span>
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{item.amount} MRU</span>
            </div>
          ))}
        </div>
        
        <div style={{ background: "#fdf2f8", border: "1px solid #c81054", padding: "24px 20px", textAlign: "center", margin: "32px 0 16px 0", borderRadius: 8, position: "relative", zIndex: 10 }}>
          <p style={{ fontSize: 13, color: "#666", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, margin: "0 0 8px 0" }}>MONTANT TOTAL PAYÉ</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: "#c81054", margin: 0 }}>{totalAmount} MRU</p>
          <div style={{ marginTop: 16 }}>
            <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 20, fontWeight: 800, fontSize: 14, background: "#fbcfe8", color: "#9d174d" }}>
              ✅ Paiement Confirmé
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 10, color: "#999", borderTop: "1px solid #eee", paddingTop: 16, position: "relative", zIndex: 10 }}>
          Ce document est généré de manière automatique et électronique, il tient lieu de preuve de paiement certifiée.<br/>
          <strong>Fiveur Arena — Sport Féminin</strong>
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
        const fileName = `recu-sf-${invoicePlayer.id}-${Date.now()}.pdf`;
        
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
        const prenomNom = `${invoicePlayer.prenom} ${invoicePlayer.nom}`;

        const msg = `=========================
SPORT FÉMININ - FIVEUR ARENA
=========================
Facture / Reçu

N° : REC-SF-${String(invoicePlayer.id).padStart(4, "0")}
Inscrite : ${prenomNom}
Éléments facturés :
${labelsList}

Montant Total : ${totalAmount} MRU
Statut : [Payé]
Date : ${new Date().toLocaleDateString("fr-FR")}
${pdfUrlLine ? `\nLien vers votre reçu PDF :\n${pdfUrlLine.replace('\n', '')}` : ""}

Merci de votre confiance !`;
        
        let phone = invoicePlayer.telephone.replace(/[^0-9]/g, "");
        if (phone.length === 8) phone = "222" + phone;
        
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
      } catch (err) {
        console.error("Erreur génération PDF:", err);
        alert("Une erreur est survenue lors de la génération du PDF.");
      } finally {
        setIsGeneratingInvoice(false);
        setInvoiceModalOpen(false);
      }
    }, 100);
  }

  async function downloadMultiInvoice() {
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
        
        pdf.save(`Facture_SportFeminin_${invoicePlayer?.prenom}_${invoicePlayer?.nom}.pdf`);
      } catch (err) {
        console.error("Erreur téléchargement PDF:", err);
        alert("Une erreur est survenue lors du téléchargement.");
      } finally {
        setIsGeneratingInvoice(false);
        setInvoiceModalOpen(false);
      }
    }, 100);
  }

  const filtered = inscriptions.filter((i) => {
    const matchesSearch = `${i.nom} ${i.prenom} ${i.telephone}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "tous" || i.statut === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Sport Féminin
        </h1>
        <p className="mt-1 text-sm text-white/50">Gérez les inscriptions et les paiements mensuels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-[#c81054]/20 bg-[#c81054]/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-[#c81054]" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Inscrites</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-4xl font-bold text-[#c81054]">
            {inscriptions.length}
          </p>
        </div>
        
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-fiver-green" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">Confirmées</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-white">
            {inscriptions.filter(i => i.statut === "confirmé").length}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-yellow-500" />
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">En attente</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-white">
            {inscriptions.filter(i => i.statut === "en_attente").length}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white/80">Réductions (20%)</span>
          </div>
          <p className="mt-4 font-[var(--font-heading)] text-3xl font-bold text-emerald-400">
            {inscriptions.filter(i => i.enfant_inscrit).length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher un nom, numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#c81054] focus:outline-none focus:ring-1 focus:ring-[#c81054]"
          />
        </div>
        <div className="flex items-center gap-2">
          {["tous", "en_attente", "confirmé", "annulé"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                filter === f
                  ? "bg-[#c81054] text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#121212] shadow-xl">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-white/40">
              <th className="px-4 py-4 w-[200px]">Nom Complet</th>
              <th className="px-4 py-4 w-[120px]">Téléphone</th>
              <th className="px-4 py-4 w-[120px] text-center">Tarif</th>
              <th className="px-4 py-4 min-w-[340px]">Paiements (Saison {currentYear})</th>
              <th className="px-4 py-4 w-32 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-white/40">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-white/40">
                  Aucune inscription trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((ins) => (
                <tr key={ins.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{ins.prenom} {ins.nom}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        ins.statut === "confirmé" ? "bg-green-500/10 text-green-400" :
                        ins.statut === "en_attente" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      )}>
                        {ins.statut.replace("_", " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <Phone className="h-3 w-3 text-white/30" />
                      {ins.telephone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ins.enfant_inscrit ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex rounded bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
                          800 MRU
                        </span>
                        {ins.enfant_nom_prenom && (
                          <span className="text-[10px] text-white/40 max-w-[100px] truncate" title={ins.enfant_nom_prenom}>{ins.enfant_nom_prenom}</span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex rounded bg-white/10 px-2 py-1 text-xs font-bold text-white/60">
                        1000 MRU
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {ALL_MONTHS.map(m => {
                        const monthStr = `${currentYear}-${m.val}`;
                        const status = getMonthStatus(ins, monthStr);
                        const colors = {
                          paye: "bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.4)] hover:brightness-110",
                          partiel: "bg-amber-500 text-black hover:brightness-110",
                          non_paye: "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
                        };
                        return (
                          <button
                            key={m.val}
                            onClick={(e) => { e.stopPropagation(); openQuickPayMonth(ins, monthStr); }}
                            className={cn("h-6 w-8 text-[9px] font-bold rounded flex items-center justify-center transition-all", colors[status])}
                            title={`${m.label} ${currentYear}`}
                          >
                            {m.label}
                          </button>
                        );
                      })}

                      {(() => {
                        const history = ins.sport_feminin_payments_history || [];
                        if (history.length === 0) return null;
                        const sorted = [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        const lastPaymentDate = sorted[0].created_at;
                        return (
                          <div className="ml-2 pl-2 border-l border-white/10 text-[10px] text-white/40 flex items-center gap-1" title="Dernier encaissement">
                            <Calendar className="h-3 w-3" />
                            {new Date(lastPaymentDate).toLocaleDateString("fr-FR")}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openInvoiceModal(ins); }}
                        className="rounded-md p-1.5 text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                        title="Générer Facture WhatsApp"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(ins.id, ins.statut === "annulé" ? "en_attente" : "annulé")}
                        className="rounded-md p-1.5 text-white/20 hover:bg-white/10 hover:text-white/80 transition-colors"
                        title={ins.statut === "annulé" ? "Restaurer" : "Annuler"}
                      >
                        {ins.statut === "annulé" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteInscription(ins.id)}
                        className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* QUICK PAY MODAL */}
      {quickPayOpen && quickPayPlayer && quickPayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 animate-in fade-in duration-200" onClick={() => setQuickPayOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#161616] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c81054]/20 text-[#c81054]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">Paiement Rapide</h3>
                <p className="text-xs text-white/40">{quickPayPlayer.prenom} {quickPayPlayer.nom}</p>
              </div>
            </div>
            
            <div className="mb-4 rounded-lg bg-white/5 p-4 text-center">
              <p className="text-sm font-medium text-white/60 mb-1">Mois de {ALL_MONTHS.find(m => m.val === quickPayTarget.split("-")[1])?.label} {quickPayTarget.split("-")[0]}</p>
              <div className="flex items-center justify-center gap-2 text-2xl font-black text-white">
                <input 
                  type="number" 
                  value={quickPayMontant}
                  onChange={(e) => setQuickPayMontant(Number(e.target.value))}
                  className="w-24 bg-transparent text-center focus:outline-none focus:border-b border-white/20"
                />
                <span className="text-sm text-white/40">MRU</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold text-white/40 uppercase">Moyen de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {["Cash", "Bankily", "Masrvi", "Autre"].map(m => (
                  <button
                    key={m}
                    onClick={() => setQuickPayMoyen(m)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      quickPayMoyen === m ? "bg-[#c81054]/20 border-[#c81054]/50 text-[#c81054]" : "border-white/5 bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold text-white/40 uppercase">Date d'encaissement</label>
              <input
                type="date"
                value={quickPayDate}
                onChange={e => setQuickPayDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white focus:border-[#c81054] focus:outline-none"
              />
            </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={submitQuickPay}
                  disabled={quickPaySaving || quickPayMontant < 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#c81054] py-3 text-sm font-black text-white shadow-lg shadow-[#c81054]/20 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {quickPaySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider l'encaissement"}
                </button>
                
                {(quickPayPlayer.sport_feminin_payments_history || []).some(h => h.mois_concerne === quickPayTarget) && (
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
      )}

      {/* MULTI-INVOICE MODAL */}
      {invoiceModalOpen && invoicePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/80 animate-in fade-in duration-200" onClick={() => setInvoiceModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="h-5 w-5 text-[#c81054]" /> Facturation (Sport Féminin)
              </h3>
              <button onClick={() => setInvoiceModalOpen(false)} className="text-white/30 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            
            {invoiceStep === "select" ? (
              <div className="p-6 flex-1 overflow-y-auto">
                <p className="text-sm text-white/60 mb-6">Sélectionnez les paiements à inclure dans le reçu de <strong>{invoicePlayer.prenom} {invoicePlayer.nom}</strong>.</p>
                <div className="space-y-2 mb-8">
                  {invoiceItems.length === 0 ? (
                    <div className="text-center p-8 bg-white/5 rounded-xl border border-white/5">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-50" />
                      <p className="text-white/50 text-sm">Aucun historique de paiement trouvé pour cette inscrite.</p>
                    </div>
                  ) : (
                    invoiceItems.map(item => (
                      <div key={item.id} 
                        onClick={() => toggleInvoiceItem(item.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                          item.selected ? "bg-[#c81054]/10 border-[#c81054]/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {item.selected ? <CheckSquare className="h-5 w-5 text-[#c81054]" /> : <Square className="h-5 w-5 text-white/20" />}
                          <div>
                            <p className={cn("font-bold", item.selected ? "text-white" : "text-white/70")}>{item.label}</p>
                            <p className="text-xs text-white/40">Payé par {item.method}</p>
                          </div>
                        </div>
                        <div className={cn("font-black text-lg", item.selected ? "text-[#c81054]" : "text-white/50")}>
                          {item.amount} MRU
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
                  <button onClick={() => setInvoiceModalOpen(false)} className="px-5 py-2.5 rounded-lg font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors">Annuler</button>
                  <button 
                    onClick={() => setInvoiceStep("preview")}
                    disabled={invoiceItems.filter(i => i.selected).length === 0}
                    className="px-6 py-2.5 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Générer l'aperçu
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex justify-center">
                  <div className="transform origin-top scale-90 sm:scale-100 shadow-xl">
                    <div ref={receiptRef}>
                      {renderReceiptContent()}
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/5 p-5 bg-[#0a0a0a] flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setInvoiceStep("select")} className="flex items-center justify-center px-4 py-3 rounded-xl border border-white/10 text-white/60 font-semibold hover:bg-white/5 hover:text-white transition-all">Retour</button>
                  <button onClick={downloadMultiInvoice} disabled={isGeneratingInvoice} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50">
                    {isGeneratingInvoice ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Printer className="h-4 w-4" /> Imprimer / Télécharger</>}
                  </button>
                  <button onClick={generateMultiInvoice} disabled={isGeneratingInvoice} className="flex-1 flex items-center justify-center gap-2 rounded-xl-[#25D366] py-3 text-sm font-black text-black shadow-lg shadow-[#25D366]/20 disabled:opacity-50 hover:brightness-110 transition-all bg-[#25D366]">
                    {isGeneratingInvoice ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MessageCircle className="h-5 w-5" /> Envoyer WhatsApp</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden Receipt for direct generation without preview (if needed later) */}
      <div style={{ position: "fixed", top: "-9999px", left: "-9999px", zIndex: -100 }}>
        {/* We reuse the receipt ref directly inside the preview step to avoid layout shifts */}
      </div>
    </div>
  );
}
