"use client";

import { useState, useMemo } from "react";
import QRCode from "qrcode";
import { CreditCard, Printer, Loader2, Square, CheckSquare, Search, AlertTriangle, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { generateBadgeCode } from "@/lib/academy";
import type { Registration } from "./page";

const CARD_W = "85.6mm";
const CARD_H = "54mm";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

export function TabCartes({
  registrations,
  saison,
  onRefresh,
}: {
  registrations: Registration[];
  saison: string;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [message, setMessage] = useState("");

  const sansCode = useMemo(() => registrations.filter(r => !r.badge_code), [registrations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(r =>
      `${r.prenom} ${r.nom} ${r.nom_pere || ""} ${r.badge_code || ""}`.toLowerCase().includes(q)
    );
  }, [registrations, search]);

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function genererCodesManquants() {
    setFixing(true);
    setMessage("");
    try {
      for (const r of sansCode) {
        let code = generateBadgeCode();
        // Collision extrêmement improbable, mais on vérifie quand même
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.from("academy_registrations").select("id").eq("badge_code", code).limit(1);
          if (!data || data.length === 0) break;
          code = generateBadgeCode();
        }
        await supabase.from("academy_registrations").update({ badge_code: code }).eq("id", r.id);
      }
      setMessage(`${sansCode.length} code(s) badge généré(s).`);
      onRefresh();
    } catch (e) {
      console.error(e);
      setMessage("Erreur pendant la génération des codes.");
    } finally {
      setFixing(false);
    }
  }

  async function imprimerCartes() {
    const cibles = registrations.filter(r => selected.has(r.id) && r.badge_code);
    if (cibles.length === 0) return;

    setPrinting(true);
    try {
      const origin = window.location.origin;
      const logoUrl = `${origin}/images/fiveur-academy-logo.png`;

      const cartes = await Promise.all(
        cibles.map(async (r) => {
          const qr = await QRCode.toDataURL(r.badge_code as string, {
            errorCorrectionLevel: "M",
            margin: 0,
            width: 600,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          const nomComplet = `${r.prenom} ${r.nom}`.trim();
          const naissance = r.date_naissance
            ? new Date(r.date_naissance + "T00:00:00").toLocaleDateString("fr-FR")
            : "";
          const photo = r.photo_url
            ? `<img class="photo" src="${escapeHtml(r.photo_url)}" alt="" />`
            : `<div class="photo placeholder">${escapeHtml((r.prenom[0] || "") + (r.nom[0] || ""))}</div>`;

          return `
            <div class="card">
              <div class="band">
                <img class="logo" src="${logoUrl}" alt="" />
                <p class="brand">Fiveur Academy<span>Carte de membre</span></p>
              </div>
              <div class="body">
                ${photo}
                <div class="infos">
                  <p class="name">${escapeHtml(nomComplet)}</p>
                  ${naissance ? `<p class="meta">Né(e) le ${escapeHtml(naissance)}</p>` : ""}
                  <p class="code">${escapeHtml(r.badge_code as string)}</p>
                </div>
                <img class="qr" src="${qr}" alt="" />
              </div>
            </div>`;
        })
      );

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cartes Academy — ${escapeHtml(saison)}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fff;
         display: flex; flex-wrap: wrap; gap: 4mm; align-content: flex-start; }
  .card { width: ${CARD_W}; height: ${CARD_H}; border-radius: 3mm; overflow: hidden;
          background: #0d0d0d; color: #fff; display: flex; flex-direction: column;
          break-inside: avoid; page-break-inside: avoid; border: 0.3mm solid #00c26e; }
  .band { height: 13mm; background: #111; border-bottom: 0.6mm solid #00c26e;
          display: flex; align-items: center; gap: 2.5mm; padding: 0 3mm; }
  .logo { height: 10mm; width: 10mm; border-radius: 50%; object-fit: cover; background: #fff; flex-shrink: 0; }
  .brand { font-size: 3.6mm; font-weight: 800; letter-spacing: 0.35mm; text-transform: uppercase;
           flex: 1; color: #fff; line-height: 1.1; }
  .brand span { display: block; font-size: 2.4mm; font-weight: 600; letter-spacing: 0.25mm;
                color: #00c26e; margin-top: 0.4mm; }
  .body { flex: 1; display: flex; align-items: center; gap: 2.5mm; padding: 2.5mm 3mm; }
  .photo { width: 16mm; height: 21mm; object-fit: cover; border-radius: 1.5mm;
           border: 0.3mm solid rgba(255,255,255,0.25); background: #1a1a1a; flex-shrink: 0; }
  .photo.placeholder { display: flex; align-items: center; justify-content: center;
                       font-size: 6mm; font-weight: 800; color: rgba(255,255,255,0.35); }
  .infos { flex: 1; min-width: 0; }
  .name { margin: 0; font-size: 4mm; font-weight: 800; text-transform: uppercase;
          line-height: 1.15; word-break: break-word; }
  .meta { margin: 1.2mm 0 0; font-size: 2.7mm; color: rgba(255,255,255,0.45); font-weight: 600; }
  .code { margin: 2mm 0 0; font-size: 3.2mm; letter-spacing: 0.8mm; font-family: "Courier New", monospace;
          color: #00c26e; font-weight: 700; }
  .qr { width: 25mm; height: 25mm; background: #fff; padding: 1mm; border-radius: 1mm; flex-shrink: 0; }
</style>
</head>
<body>
${cartes.join("\n")}
<script>
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });
</script>
</body>
</html>`;

      const win = window.open("", "_blank");
      if (!win) {
        setMessage("Le navigateur a bloqué la fenêtre d'impression. Autorisez les pop-ups puis réessayez.");
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error(e);
      setMessage("Erreur pendant la génération des cartes.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <div className="mb-2 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Cartes de badge QR</h2>
        </div>
        <p className="text-xs text-white/40">
          Format carte bancaire (85,6 × 54 mm), 10 par page A4. À imprimer, plastifier et remettre à chaque enfant avec un cordon.
        </p>
        <p className="mt-2 text-xs text-white/40">
          La carte ne porte que des informations permanentes (nom, date de naissance, photo, code) : ni catégorie, ni discipline, ni saison.
          Elle reste donc valable année après année — la catégorie et l&apos;état de l&apos;abonnement s&apos;affichent à l&apos;écran au moment du scan.
        </p>
      </div>

      {message && (
        <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white/70">{message}</div>
      )}

      {sansCode.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300/80">{sansCode.length} enfant(s) sans code badge.</p>
          </div>
          <button
            onClick={genererCodesManquants}
            disabled={fixing}
            className="flex items-center gap-2 rounded-sm bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Générer les codes manquants
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un enfant..."
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none"
          />
        </div>
        <button onClick={() => setSelected(new Set(filtered.filter(r => r.badge_code).map(r => r.id)))} className="rounded-sm bg-white/5 px-3 py-2.5 text-xs font-medium text-white/60 hover:bg-white/10">
          Tout sélectionner
        </button>
        <button onClick={() => setSelected(new Set())} className="rounded-sm bg-white/5 px-3 py-2.5 text-xs font-medium text-white/60 hover:bg-white/10">
          Aucun
        </button>
        <button
          onClick={imprimerCartes}
          disabled={selected.size === 0 || printing}
          className="flex items-center gap-2 rounded-sm bg-fiver-green px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-30"
        >
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Imprimer ({selected.size})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(r => {
          const checked = selected.has(r.id);
          return (
            <button
              key={r.id}
              onClick={() => r.badge_code && toggle(r.id)}
              disabled={!r.badge_code}
              className={cn(
                "flex items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors",
                checked ? "border-fiver-green/40 bg-fiver-green/10" : "border-white/5 bg-white/[0.02] hover:bg-white/5",
                !r.badge_code && "opacity-40"
              )}
            >
              {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-fiver-green" /> : <Square className="h-4 w-4 shrink-0 text-white/20" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/85">{r.prenom} {r.nom}</p>
                <p className="font-mono text-[11px] text-white/35">{r.badge_code || "Pas de code"}</p>
              </div>
              {r.categorie_foot && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/50">{r.categorie_foot}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-white/30">Aucun enfant trouvé.</p>
      )}
    </div>
  );
}
