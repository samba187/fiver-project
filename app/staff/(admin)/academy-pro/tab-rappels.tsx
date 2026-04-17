"use client";

import { useState, useMemo, useEffect } from "react";
import { MessageCircle, Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Registration, Tarifs } from "./page";

import { getStatutMoisEnCours } from "./tab-inscriptions";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

const DEFAULT_TEMPLATES = {
  rappel: "Bonjour, ceci est un rappel de la Fiveur Academy. Le paiement mensuel de {MONTANT} MRU pour l'inscription de {PRENOM} {NOM} ({PRESTATION}) est en attente. Date limite : le {JOUR_LIMITE} du mois. Merci de régulariser. Cordialement, Fiveur Academy.",
  retard: "⚠️ Bonjour, la Fiveur Academy vous informe que le paiement mensuel de {MONTANT} MRU pour {PRENOM} {NOM} est EN RETARD. La deadline du {JOUR_LIMITE} est passée. Merci de procéder au règlement dans les plus brefs délais. Contact : Fiveur Academy.",
  confirmation: "✅ Bonjour, la Fiveur Academy confirme la réception du paiement de {MONTANT} MRU pour {PRENOM} {NOM}. Inscription validée pour : {PRESTATION}. Merci de votre confiance ! ⚽ Fiveur Academy — Since 2026.",
};

function getTypeRappel(r: Registration, jourLimite: number) {
  const s = getStatutMoisEnCours(r, jourLimite);
  if (s.status === "ok") return { type: "confirmation" as const, label: "✅ Confirmation", cls: "bg-green-500/10 text-green-400" };
  if (s.status === "retard") return { type: "retard" as const, label: "🔴 Retard", cls: "bg-red-500/10 text-red-400" };
  return { type: "rappel" as const, label: "🟡 Rappel", cls: "bg-amber-500/10 text-amber-400" };
}

function generateMessage(r: Registration, templates: typeof DEFAULT_TEMPLATES, jourLimite: number) {
  const info = getTypeRappel(r, jourLimite);
  const template = templates[info.type];
  const prestation = r.football && r.centre_loisirs ? "Foot + Loisirs" : r.football ? "Football" : r.centre_loisirs ? "Centre de Loisirs" : "—";
  return template
    .replace(/{NOM}/g, r.nom)
    .replace(/{PRENOM}/g, r.prenom)
    .replace(/{MONTANT}/g, String(r.tarif_total || 0))
    .replace(/{PRESTATION}/g, prestation)
    .replace(/{JOUR_LIMITE}/g, String(jourLimite));
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

export function TabRappels({ registrations, tarifs }: { registrations: Registration[]; tarifs: Tarifs }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [filter, setFilter] = useState<"all" | "rappel" | "retard" | "confirmation">("all");
  const [search, setSearch] = useState("");
  const [editTemplates, setEditTemplates] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("settings").select("key, value").eq("key", "academy_message_templates").single();
      if (data?.value) { try { setTemplates(JSON.parse(data.value)); } catch {} }
    }
    fetch();
  }, []);

  async function saveTemplates() {
    const value = JSON.stringify(templates);
    const { data } = await supabase.from("settings").select("key").eq("key", "academy_message_templates").limit(1);
    if (data && data.length > 0) await supabase.from("settings").update({ value }).eq("key", "academy_message_templates");
    else await supabase.from("settings").insert({ key: "academy_message_templates", value });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const filtered = useMemo(() => {
    return registrations
      .filter(r => r.telephone_parent)
      .filter(r => {
        // Skip fin de mois inscriptions in their first month
        if (r.inscription_fin_de_mois && r.created_at && new Date(r.created_at).getMonth() === new Date().getMonth()) return false;
        return true;
      })
      .filter(r => filter === "all" || getTypeRappel(r, tarifs.jourLimitePaiement).type === filter)
      .filter(r => !search || (r.nom + " " + r.prenom).toLowerCase().includes(search.toLowerCase()));
  }, [registrations, filter, search, tarifs.jourLimitePaiement]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:max-h-[calc(100vh-250px)]">
      
      {/* Sidebar: Filters & Templates */}
      <div className="flex w-full flex-col gap-4 lg:w-80 flex-shrink-0">
        
        {/* Search & Filter */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Chercher un nom..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-sm border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {[
              { key: "all" as const, label: "Tous" },
              { key: "rappel" as const, label: "🟡 Rappels" },
              { key: "retard" as const, label: "🔴 Retards" },
              { key: "confirmation" as const, label: "✅ Confirmations" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn("rounded-sm px-3 py-1.5 text-xs font-medium transition-colors w-full text-left",
                  filter === f.key ? "bg-fiver-green text-fiver-black" : "text-white/50 hover:bg-white/5 hover:text-white")}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info rules */}
        <div className="rounded-lg border border-fiver-green/10 bg-fiver-green/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-fiver-green/70 font-bold mb-2">Règles actives</p>
          <p className="text-xs text-white/50">📅 Deadline : le <strong className="text-white">{tarifs.jourLimitePaiement}</strong> du mois</p>
          <p className="text-xs text-white/50">🔴 Retard auto après le <strong className="text-red-400">{tarifs.jourLimitePaiement}</strong></p>
          <p className="text-xs text-white/50 mt-1">Variable: <code className="text-fiver-green/70">{"{JOUR_LIMITE}"}</code></p>
        </div>

        {/* Templates */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => setEditTemplates(!editTemplates)} className="flex w-full items-center justify-between bg-white/[0.02] p-4 text-left hover:bg-white/[0.04] transition-colors">
            <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">✏️ Modèles WhatsApp</h2>
            {editTemplates ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronRight className="h-4 w-4 text-white/50" />}
          </button>
          
          {editTemplates && (
            <div className="p-4 flex flex-col gap-4 border-t border-white/5">
              {(["rappel", "retard", "confirmation"] as const).map(key => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">
                    {key === "rappel" ? "🟡 Modèle Rappel" : key === "retard" ? "🔴 Modèle Retard" : "✅ Modèle Confirmation"}
                  </label>
                  <textarea value={templates[key]} onChange={e => setTemplates({ ...templates, [key]: e.target.value })}
                    rows={4} className={cn(inputClass, "resize-none text-xs bg-[#1a1a1a]")} />
                </div>
              ))}
              <div className="rounded-sm bg-white/5 p-2 mb-2">
                 <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-widest">Variables dispos</p>
                 <p className="text-[10px] text-white/50 font-mono">{"{NOM} {PRENOM} {MONTANT} {PRESTATION} {JOUR_LIMITE}"}</p>
              </div>
              <button onClick={saveTemplates} className="w-full rounded-sm bg-fiver-green px-4 py-2 text-xs font-bold uppercase tracking-wide text-fiver-black hover:opacity-90">
                {saved ? "✅ Sauvegardé" : "Enregistrer les modèles"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Messages List (Scrollable) */}
      <div className="flex flex-col flex-1 bg-white/[0.01] border border-white/5 rounded-lg overflow-hidden lg:h-full min-h-[500px]">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
           <h3 className="font-bold text-white tracking-wide uppercase text-sm flex items-center gap-2">
             <MessageCircle className="h-4 w-4 text-fiver-green"/> File d'attente des messages
           </h3>
           <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">{filtered.length} Destinataires</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30 text-sm italic">Aucun message pour ces critères.</div>
          ) : filtered.map(r => {
            const info = getTypeRappel(r, tarifs.jourLimitePaiement);
            const msg = generateMessage(r, templates, tarifs.jourLimitePaiement);
            const phone = formatPhone(r.telephone_parent);
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
            return (
              <div key={r.id} className="rounded-lg border border-white/5 bg-[#121212] p-4 transition-colors hover:border-white/10">
                <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white/40">#{r.id}</span>
                    <div>
                      <span className="block text-sm font-bold text-white">{r.nom} {r.prenom}</span>
                      <span className="block text-xs font-mono text-white/40">{r.telephone_parent}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", info.cls)}>{info.label}</span>
                  </div>
                </div>
                <div className="rounded border border-white/5 bg-white/[0.02] p-3 text-xs text-white/70 leading-relaxed font-mono whitespace-pre-wrap">
                  {msg}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => navigator.clipboard.writeText(msg)}
                    className="flex items-center gap-1.5 rounded-sm border border-white/10 px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                    Copier
                  </button>
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-sm bg-[#25D366] px-4 py-2 text-xs font-bold text-black transition-transform hover:scale-105 shadow-lg shadow-[#25D366]/20">
                    <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
