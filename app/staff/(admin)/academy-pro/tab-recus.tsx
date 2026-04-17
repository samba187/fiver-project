"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Printer, MessageCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import type { Registration } from "./page";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

export function TabRecus({ registrations }: { registrations: Registration[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [historyData, setHistoryData] = useState<any>(null); // null = fetching/none, false = not paid, object = paid
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const monthOptions = useMemo(() => {
    const d = new Date();
    const currentLbl = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const opts = [{ value: "current", label: currentLbl.charAt(0).toUpperCase() + currentLbl.slice(1) }];
    for (let i = 1; i <= 6; i++) {
        const pastDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const val = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}`;
        const lbl = pastDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        opts.push({ value: val, label: lbl.charAt(0).toUpperCase() + lbl.slice(1) });
    }
    return opts;
  }, []);

  useEffect(() => {
    if (selectedMonth === "current" || !selectedId) {
      setHistoryData(null);
      return;
    }
    async function fetchHistory() {
      setHistoryData(null);
      const { data } = await supabase.from("academy_payments_history")
        .select("*")
        .eq("registration_id", selectedId)
        .eq("mois_concerne", selectedMonth)
        .order("id", { ascending: false })
        .limit(1);
      setHistoryData(data && data.length > 0 ? data[0] : false);
    }
    fetchHistory();
  }, [selectedId, selectedMonth]);

  const rawReg = registrations.find(r => r.id === selectedId);

  const reg = useMemo(() => {
    if (!rawReg) return null;
    if (selectedMonth === "current") return rawReg;
    if (historyData === false) {
      // Non payé ce mois-là
      return { ...rawReg, montant_paye: 0, statut_paiement: "retard", moyen_paiement: null, date_paiement: null };
    }
    if (historyData) {
      // Payé ce mois-là dans l'historique
      return { ...rawReg, montant_paye: historyData.montant, statut_paiement: "paye", moyen_paiement: historyData.moyen_paiement, date_paiement: historyData.date_paiement };
    }
    return null; // En chargement
  }, [rawReg, selectedMonth, historyData]);

  const recuNum = reg && selectedMonth !== "current" && historyData 
    ? `REC-${String(historyData.id).padStart(4, "0")}` 
    : reg ? `REC-${String(reg.id).padStart(4, "0")}` : "";

  const currentMonthLabel = useMemo(() => {
    const lbl = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return lbl.charAt(0).toUpperCase() + lbl.slice(1);
  }, []);

  const displayMonth = selectedMonth === "current" 
    ? currentMonthLabel 
    : monthOptions.find(m => m.value === selectedMonth)?.label;

  function handlePrint() {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = origin + '/images/fiveur-academy-logo.png';
    
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Reçu ${recuNum}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
      body { padding: 40px; color: #1a1a1a; }
      .receipt { max-width: 600px; margin: 0 auto; position: relative; }
      .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #2d6a2e; padding-bottom: 16px; }
      .header h1 { font-size: 24px; font-weight: 800; color: #2d6a2e; }
      .header p { font-size: 12px; color: #666; margin-top: 4px; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
      .section-title { background: #2d6a2e; color: white; padding: 6px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .total { background: #f0fdf0; border: 2px solid #2d6a2e; padding: 12px; text-align: center; margin: 20px 0; border-radius: 4px; }
      .total .amount { font-size: 28px; font-weight: 800; color: #2d6a2e; }
      .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
      .photo-container { position: absolute; top: 120px; right: 40px; width: 80px; height: 80px; border-radius: 40px; overflow: hidden; border: 2px solid #2d6a2e; }
      .photo-container img { width: 100%; height: 100%; object-fit: cover; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="receipt">${content}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 800);
  }

  async function sendWhatsApp() {
    if (!reg) return;
    setIsGenerating(true);
    try {
      const age = calcAge(reg.date_naissance);
      const nomComplet = `${reg.prenom} ${reg.nom_pere ? reg.nom_pere + " " : ""}${reg.nom}`;
      const fraisLine = !reg.frais_inscription_paye ? `\nFrais d'inscription : ${reg.frais_inscription} MRU` : "";
      
      // Generation du PDF via html-to-image et jsPDF
      const imgData = await htmlToImage.toPng(receiptRef.current!, { 
        pixelRatio: 2,
        skipAutoScale: true
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const pdfBlob = pdf.output("blob");
      const fileName = `recu-${reg.id}-${Date.now()}.pdf`;
      
      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage.from("academy_receipts").upload(fileName, pdfBlob, {
        contentType: "application/pdf"
      });
      
      let pdfUrlLine = "";
      if (!uploadError) {
        const { data } = supabase.storage.from("academy_receipts").getPublicUrl(fileName);
        let finalUrl = data.publicUrl;
        
        // Raccourcir l'URL pour faire plus propre via TinyURL
        try {
          const shortRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(finalUrl)}`);
          if (shortRes.ok) {
            finalUrl = await shortRes.text();
          }
        } catch (e) {
          console.warn("Erreur raccourcissement URL", e);
        }
        
        pdfUrlLine = finalUrl;
      } else {
        console.error("Upload error:", uploadError);
      }

      const msg = `=========================
FIVEUR ACADEMY
=========================
Facture / Reçu de paiement 

N° : ${recuNum}
Mois : ${displayMonth}

Joueur : ${nomComplet.toUpperCase()}
${age ? `Age : ${age} ans\n` : ""}${reg.football && reg.categorie_foot ? `Categorie : ${reg.categorie_foot}\n` : ""}${reg.centre_loisirs ? `Loisirs : Inclus\n` : ""}
Mensualite : ${reg.tarif_total} MRU${fraisLine}
Montant regle : ${reg.montant_paye} MRU${reg.moyen_paiement ? ` (${reg.moyen_paiement})` : ""}
Statut : ${reg.statut_paiement === "paye" ? "[Paye]" : reg.statut_paiement === "partiel" ? "[Partiel]" : "[En attente]"}
${reg.date_paiement ? `Date : ${new Date(reg.date_paiement).toLocaleDateString("fr-FR")}\n` : ""}
${pdfUrlLine ? `\nLien vers votre impression PDF :\n${pdfUrlLine.replace('\n', '')}` : ""}

Merci de votre confiance.`;
      
      const phone = formatPhone(reg.telephone_parent);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Selector */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <h2 className="mb-3 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Sélectionner un inscrit</h2>
            <select value={selectedId || ""} onChange={e => setSelectedId(parseInt(e.target.value) || null)} className={inputClass}>
              <option value="" className="bg-[#161616]">— Choisir un inscrit —</option>
              {registrations.map(r => (
                <option key={r.id} value={r.id} className="bg-[#161616]">#{r.id} — {r.prenom} {r.nom_pere ? r.nom_pere + " " : ""}{r.nom}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <h2 className="mb-3 font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Mois du reçu</h2>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={cn(inputClass, "pl-10")}>
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value} className="bg-[#161616]">{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!reg && selectedId && selectedMonth !== "current" && historyData === null && (
        <div className="text-white/50 text-sm animate-pulse">Recherche dans l'historique...</div>
      )}

      {reg && (
        <>
          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 rounded-sm bg-fiver-green px-5 py-2.5 text-xs font-semibold uppercase text-fiver-black hover:opacity-90">
              <Printer className="h-4 w-4" /> Imprimer / Télécharger PDF
            </button>
            <button onClick={sendWhatsApp} disabled={isGenerating} className="flex items-center gap-2 rounded-sm bg-green-600 px-5 py-2.5 text-xs font-semibold uppercase text-white hover:bg-green-500 disabled:opacity-50">
              {isGenerating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <MessageCircle className="h-4 w-4" />}
              {isGenerating ? "Génération PDF..." : "Envoyer via WhatsApp"}
            </button>
          </div>

          {/* Receipt Preview */}
          <div className="rounded-lg border border-white/10 bg-white p-6 text-black relative">
            <div ref={receiptRef} style={{ background: "white", padding: "20px", position: "relative", zIndex: 1 }}>
              {/* WATERMARK */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.05, pointerEvents: "none", zIndex: -1 }}>
                <img src="/images/fiveur-academy-logo.png" alt="Watermark" style={{ width: 320, height: "auto" }} />
              </div>

              <div className="header" style={{ position: "relative", zIndex: 10 }}>
                <img src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" style={{ height: 48, marginBottom: 12, display: "block", marginLeft: "auto", marginRight: "auto" }} />
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2d6a2e", textTransform: "uppercase" }}>Fiveur Academy</h1>
                <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Since 2026 — Nouakchott, Mauritanie</p>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>REÇU DE PAIEMENT</h2>
              </div>

              <div className="meta" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 20 }}>
                <span><strong>Reçu N° :</strong> {recuNum}</span>
                <span><strong>Mois :</strong> {displayMonth}</span>
              </div>

              <div className="section-title" style={{ background: "#2d6a2e", color: "white", padding: "6px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Informations de l'inscrit</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0" }}>
                <div style={{ flex: 1, paddingRight: reg.photo_url ? "16px" : "0" }}>
                  <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#666" }}>Nom et Prénom :</span>
                    <span style={{ fontWeight: 600, textTransform: "uppercase" }}>
                      {reg.prenom} {reg.nom_pere ? reg.nom_pere + " " : ""}{reg.nom}
                    </span>
                  </div>
                  {reg.date_naissance && (
                    <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                      <span style={{ color: "#666" }}>Date de naissance :</span><span style={{ fontWeight: 600 }}>{new Date(reg.date_naissance).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                  {reg.telephone_parent && (
                    <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                      <span style={{ color: "#666" }}>Tél. parent :</span><span style={{ fontWeight: 600 }}>{reg.telephone_parent}</span>
                    </div>
                  )}
                </div>
                {reg.photo_url && (
                  <div className="photo-container" style={{ width: 70, height: 70, borderRadius: 35, overflow: "hidden", border: "2px solid #2d6a2e", flexShrink: 0, marginTop: 4 }}>
                    <img src={reg.photo_url} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>

              <div className="section-title" style={{ background: "#2d6a2e", color: "white", padding: "6px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 16 }}>Détail de l'inscription</div>
              <div style={{ padding: "8px 0" }}>
                {reg.football && (
                  <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    <span>⚽ Football Academy {reg.categorie_foot ? `(${reg.categorie_foot})` : ""}</span><span style={{ fontWeight: 600 }}>{reg.tarif_football} MRU</span>
                  </div>
                )}
                {reg.centre_loisirs && (
                  <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    <span>🎯 Centre de Loisirs</span><span style={{ fontWeight: 600 }}>{reg.tarif_loisirs} MRU</span>
                  </div>
                )}
                {!reg.frais_inscription_paye && (
                  <div className="row" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee", color: "#92400e" }}>
                    <span>🎟️ Frais d'inscription (1ère fois)</span><span style={{ fontWeight: 700 }}>+ {reg.frais_inscription} MRU</span>
                  </div>
                )}
              </div>

              <div className="total" style={{ background: "#f0fdf0", border: "2px solid #2d6a2e", padding: 12, textAlign: "center", margin: "20px 0", borderRadius: 4 }}>
                <p style={{ fontSize: 12, color: "#666", textTransform: "uppercase" }}>MONTANT TOTAL DÛ</p>
                <p className="amount" style={{ fontSize: 28, fontWeight: 800, color: "#2d6a2e" }}>
                  {reg.tarif_total + (reg.frais_inscription_paye ? 0 : reg.frais_inscription)} MRU
                </p>
                {!reg.frais_inscription_paye && (
                  <p style={{ fontSize: 10, color: "#666", marginTop: 4 }}>({reg.tarif_total} MRU mensuel + {reg.frais_inscription} MRU frais inscription)</p>
                )}
              </div>

              <div className="section-title" style={{ background: "#2d6a2e", color: "white", padding: "6px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Statut du paiement</div>
              <div style={{ padding: "12px 0", textAlign: "center" }}>
                <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, fontWeight: 700, fontSize: 14,
                  background: reg.statut_paiement === "paye" ? "#dcfce7" : reg.statut_paiement === "partiel" ? "#fef3c7" : "#fee2e2",
                  color: reg.statut_paiement === "paye" ? "#166534" : reg.statut_paiement === "partiel" ? "#92400e" : "#991b1b" }}>
                  {reg.statut_paiement === "paye" ? "✅ Payé" : reg.statut_paiement === "partiel" ? "🟡 Partiel" : "🔴 En attente"}
                </span>
                {reg.moyen_paiement && <p style={{ marginTop: 8, fontSize: 13, color: "#666", textTransform: "uppercase", fontWeight: "bold" }}>Moyen de paiement : {reg.moyen_paiement}</p>}
                {reg.date_paiement && <p style={{ marginTop: 4, fontSize: 13, color: "#666" }}>Date de paiement : {new Date(reg.date_paiement).toLocaleDateString("fr-FR")}</p>}
                <p style={{ marginTop: 4, fontSize: 13, color: "#2d6a2e" }}>Montant réglé : <strong>{reg.montant_paye} MRU</strong></p>
              </div>

              <div className="footer" style={{ textAlign: "center", margin: "40px 0 20px 0", fontSize: 10, color: "#999", borderTop: "1px solid #eee", paddingTop: 16, position: "relative", zIndex: 10 }}>
                Ce document est généré de manière automatique et électronique, il tient lieu de preuve de paiement certifiée.<br />
                Fiveur Academy — Since 2026
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
