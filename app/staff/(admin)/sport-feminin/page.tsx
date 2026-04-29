"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Heart, Check, X, Phone, Trash2, Calendar, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export default function SportFemininAdminPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("tous");

  useEffect(() => {
    fetchInscriptions();
  }, []);

  async function fetchInscriptions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sport_feminin_inscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setInscriptions(data);
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

  function handlePrint(ins: Inscription) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const tarif = ins.enfant_inscrit ? "800 MRU" : "1000 MRU";
    const montantTotal = ins.enfant_inscrit ? 800 : 1000;
    const dateFormatted = new Date().toLocaleDateString("fr-FR");
    const recuNum = `REC-SF-${String(ins.id).padStart(4, "0")}`;

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Facture ${recuNum}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
      body { padding: 40px; color: #1a1a1a; }
      .receipt { max-width: 600px; margin: 0 auto; position: relative; z-index: 1; }
      .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #c81054; padding-bottom: 16px; position: relative; z-index: 10; }
      .header h1 { font-size: 24px; font-weight: 800; color: #c81054; }
      .header p { font-size: 12px; color: #666; margin-top: 4px; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
      .section-title { background: #c81054; color: white; padding: 6px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .total { background: #fdf2f8; border: 2px solid #c81054; padding: 12px; text-align: center; margin: 20px 0; border-radius: 4px; }
      .total .amount { font-size: 28px; font-weight: 800; color: #c81054; }
      .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; position: relative; z-index: 10; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="receipt">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; pointer-events: none; z-index: -1;">
          <img src="${origin}/images/fiveur-academy-logo.png" alt="Watermark" style="width: 320px; height: auto;" />
        </div>
        <div class="header">
          <img src="${origin}/images/fiveur-academy-logo.png" alt="Fiveur Academy" style="height: 48px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />
          <h1 style="text-transform: uppercase;">Sport Féminin</h1>
          <p>Fiveur Arena — Nouakchott, Mauritanie</p>
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 12px;">FACTURE / REÇU</h2>
        </div>
        <div class="meta">
          <span><strong>N° :</strong> ${recuNum}</span>
          <span><strong>Date :</strong> ${dateFormatted}</span>
        </div>
        <div class="section-title">Informations de l'Inscrite</div>
        <div>
          <div class="row"><span style="color:#666">Nom et Prénom :</span><span style="font-weight:600;text-transform:uppercase">${ins.prenom} ${ins.nom}</span></div>
          <div class="row"><span style="color:#666">Téléphone :</span><span style="font-weight:600">${ins.telephone}</span></div>
          ${ins.enfant_inscrit ? `<div class="row"><span style="color:#666">Enfant inscrit (Academy) :</span><span style="font-weight:600">${ins.enfant_nom_prenom || "Oui"}</span></div>` : ""}
        </div>
        <div class="section-title">Détail</div>
        <div>
          <div class="row"><span>Abonnement Mensuel Sport Féminin</span><span style="font-weight:600">1000 MRU</span></div>
          ${ins.enfant_inscrit ? `<div class="row" style="color:#c81054"><span>Réduction Parent Academy (-20%)</span><span style="font-weight:700">- 200 MRU</span></div>` : ""}
        </div>
        <div class="total">
          <p style="font-size:12px;color:#666;text-transform:uppercase">MONTANT TOTAL PAYÉ</p>
          <p class="amount">${montantTotal} MRU</p>
        </div>
        <div style="text-align:center; padding:12px 0;">
          <span style="display:inline-block; padding:6px 16px; border-radius:20px; font-weight:700; font-size:14px; background:#dcfce7; color:#166534;">
            ✅ Payé et Confirmé
          </span>
        </div>
        <div class="footer">
          Ce document est généré de manière automatique et électronique, il tient lieu de preuve de paiement certifiée.<br/>
          Fiveur Arena — Sport Féminin
        </div>
      </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
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
        <p className="mt-1 text-sm text-white/50">Gérez les inscriptions aux séances de sport féminin</p>
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
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
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
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Nom Complet</th>
                <th className="px-6 py-4 font-semibold">Date de Naissance</th>
                <th className="px-6 py-4 font-semibold">Téléphone</th>
                <th className="px-6 py-4 font-semibold text-center">Tarif</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    Aucune inscription trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((ins) => (
                  <tr key={ins.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{ins.prenom} {ins.nom}</div>
                      <div className="text-xs text-white/40">{new Date(ins.created_at).toLocaleDateString("fr-FR")}</div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(ins.date_naissance).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-white/40" />
                        <a href={`tel:${ins.telephone}`} className="hover:text-white hover:underline">{ins.telephone}</a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {ins.enfant_inscrit ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                            800 MRU (-20%)
                          </span>
                          {ins.enfant_nom_prenom && (
                            <span className="text-[10px] text-white/50">{ins.enfant_nom_prenom}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-white/60">
                          1000 MRU
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        ins.statut === "confirmé" ? "bg-fiver-green/10 text-fiver-green border-fiver-green/20" :
                        ins.statut === "en_attente" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {ins.statut === "confirmé" && <Check className="h-3 w-3" />}
                        {ins.statut === "annulé" && <X className="h-3 w-3" />}
                        {ins.statut.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://wa.me/222${ins.telephone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                        >
                          WhatsApp
                        </a>
                        {ins.statut === "en_attente" && (
                          <button
                            onClick={() => updateStatus(ins.id, "confirmé")}
                            className="rounded-md bg-fiver-green/10 px-3 py-1.5 text-xs font-medium text-fiver-green hover:bg-fiver-green/20 transition-colors"
                          >
                            Confirmer
                          </button>
                        )}
                        {ins.statut === "confirmé" && (
                          <button
                            onClick={() => handlePrint(ins)}
                            className="flex items-center gap-1.5 rounded-md bg-[#c81054]/10 px-3 py-1.5 text-xs font-medium text-[#c81054] hover:bg-[#c81054]/20 transition-colors"
                            title="Générer la facture"
                          >
                            <Printer className="h-3.5 w-3.5" /> Facture
                          </button>
                        )}
                        {ins.statut !== "annulé" && (
                          <button
                            onClick={() => updateStatus(ins.id, "annulé")}
                            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            Annuler
                          </button>
                        )}
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
      </div>
    </div>
  );
}
