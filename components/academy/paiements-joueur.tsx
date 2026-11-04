"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Camera, Check, Upload, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { currentMonthStr, moisDeSaison } from "@/lib/academy";
import {
  statutMoisEnfant, fraisEnVerification, libelleMois, libelleDepot, imageEnDataUrl, LIBELLE_STATUT,
  MOYENS_PAIEMENT_PARENT, MOYENS_SANS_CAPTURE, type DonneesParent, type EnfantParent, type PreuveParent, type StatutMois,
} from "@/lib/parents";

// Fiche joueur (coach / staff / admin) : état des paiements de l'enfant et dépôt d'un paiement
// à la place du parent (espèces, ou Bankily quand le parent n'y arrive pas). L'admin valide ensuite.

const COULEUR: Record<StatutMois, string> = {
  paye: "bg-fiver-green text-fiver-black", partiel: "bg-amber-500 text-black", a_payer: "bg-amber-400/20 text-amber-200",
  retard: "bg-red-500/25 text-red-200", en_verification: "bg-sky-400/25 text-sky-200", offert: "bg-white/10 text-white/40",
  a_venir: "bg-white/5 text-white/40", avant_saison: "bg-white/[0.02] text-white/15", arrete: "bg-red-500/10 text-red-300/60",
};
const mru = (n: number) => `${n.toLocaleString("fr-FR")} MRU`;

export function PaiementsJoueur({ joueurId, auteur }: { joueurId: number; auteur: string | null }) {
  const [enfant, setEnfant] = useState<EnfantParent | null>(null);
  const [tarifs, setTarifs] = useState<DonneesParent["tarifs"]>(null);
  const [formulaire, setFormulaire] = useState(false);

  const charger = useCallback(async () => {
    const [{ data: r }, { data: p }, { data: t }] = await Promise.all([
      supabase.from("academy_registrations").select("*, academy_payments_history(*)").eq("id", joueurId).maybeSingle(),
      supabase.from("academy_preuves_paiement").select("id, mois_concerne, montant, moyen_paiement, details, statut, motif_refus, note, depose_par, traite_le, created_at")
        .eq("registration_id", joueurId).order("created_at", { ascending: false }),
      supabase.from("settings").select("value").eq("key", "academy_tarifs").maybeSingle(),
    ]);
    try { setTarifs(t?.value ? JSON.parse(t.value) : null); } catch { setTarifs(null); }
    if (r) setEnfant({ ...(r as EnfantParent), preuves: (p as PreuveParent[]) || [], evaluations: [], photos: [], seances: [], scans: [] });
  }, [joueurId]);

  useEffect(() => { charger(); }, [charger]);

  if (!enfant) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-fiver-green" /></div>;

  const enAttente = enfant.preuves.filter(p => p.statut === "en_attente");

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-white/70">Paiements</h3>
        {!formulaire && (
          <button onClick={() => setFormulaire(true)} className="flex items-center gap-1 rounded-md bg-fiver-green/10 px-2.5 py-1.5 text-xs font-bold text-fiver-green">
            <Upload className="h-3.5 w-3.5" /> Déposer un paiement
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <span className={cn("rounded px-1.5 py-1 text-[10px] font-bold", enfant.frais_inscription_paye ? COULEUR.paye : fraisEnVerification(enfant) ? COULEUR.en_verification : COULEUR.retard)}>
          FRAIS {enfant.frais_inscription_paye ? "✓" : ""}
        </span>
        {moisDeSaison(enfant.saison).map(m => {
          const s = statutMoisEnfant(enfant, m, tarifs);
          return (
            <span key={m} title={`${libelleMois(m)} : ${LIBELLE_STATUT[s.statut]}`} className={cn("rounded px-1.5 py-1 text-[10px] font-bold", COULEUR[s.statut])}>
              {libelleMois(m).slice(0, 3)}
            </span>
          );
        })}
      </div>

      {enAttente.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {enAttente.map(p => (
            <p key={p.id} className="rounded-md bg-sky-400/10 px-2.5 py-1.5 text-xs text-sky-200">
              En vérification : {libelleDepot(p)} · {mru(p.montant)} · {p.moyen_paiement}{p.depose_par ? ` · déposé par ${p.depose_par}` : " · déposé par le parent"}
            </p>
          ))}
        </div>
      )}

      {formulaire && <FormulaireDepot enfant={enfant} tarifs={tarifs} auteur={auteur} onFermer={() => setFormulaire(false)} onEnvoye={async () => { setFormulaire(false); await charger(); }} />}
    </div>
  );
}

function FormulaireDepot({ enfant, tarifs, auteur, onFermer, onEnvoye }: {
  enfant: EnfantParent; tarifs: DonneesParent["tarifs"]; auteur: string | null; onFermer: () => void; onEnvoye: () => Promise<void>;
}) {
  const moisActuel = currentMonthStr();
  const options = useMemo(() => {
    const opts: { val: string; label: string; reste: number }[] = [];
    if (!enfant.frais_inscription_paye && !fraisEnVerification(enfant)) opts.push({ val: "FRAIS", label: "Frais d'inscription", reste: enfant.frais_inscription });
    for (const m of moisDeSaison(enfant.saison)) {
      const s = statutMoisEnfant(enfant, m, tarifs);
      if (["a_payer", "retard", "partiel", "a_venir"].includes(s.statut)) opts.push({ val: m, label: libelleMois(m), reste: Math.max(0, s.du - s.paye) });
    }
    return opts.filter(o => o.reste > 0);
  }, [enfant, tarifs]);

  const [choix, setChoix] = useState<string[]>(() => {
    const d = options.find(o => o.val === moisActuel) || options.find(o => o.val !== "FRAIS") || options[0];
    return d ? [d.val] : [];
  });
  const [montantSaisi, setMontantSaisi] = useState<string | null>(null);
  const [moyen, setMoyen] = useState("Cash");
  const [image, setImage] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const inputImage = useRef<HTMLInputElement>(null);

  const selection = options.filter(o => choix.includes(o.val));
  const totalDu = selection.reduce((s, o) => s + o.reste, 0);
  const montant = selection.length === 1 && montantSaisi !== null ? parseInt(montantSaisi) || 0 : totalDu;
  const sansCapture = MOYENS_SANS_CAPTURE.includes(moyen);

  async function choisirImage(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try { setImage(await imageEnDataUrl(f, 1200)); } catch { setErreur("Image illisible."); }
  }

  async function envoyer() {
    setErreur("");
    if (selection.length === 0 || !(montant > 0)) { setErreur("Choisissez au moins un mois."); return; }
    if (!image && !sansCapture) { setErreur("Ajoutez la capture d'écran du paiement."); return; }
    const details = selection.length === 1 ? [{ mois: selection[0].val, montant }] : selection.map(o => ({ mois: o.val, montant: o.reste }));
    setEnvoi(true);
    const { error } = await supabase.from("academy_preuves_paiement").insert({
      registration_id: enfant.id, parent_id: null, mois_concerne: details[0].mois, montant: details.reduce((t, d) => t + d.montant, 0),
      moyen_paiement: moyen, image: image || null, details, note: note.trim() || null, depose_par: auteur || "staff",
    });
    if (error) { setErreur(error.message); setEnvoi(false); return; }
    // Prévenir l'académie par e-mail, comme pour un dépôt du parent
    fetch("/api/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "paiement_parent", origin: window.location.origin,
        data: {
          enfant: `${enfant.prenom} ${enfant.nom}`, categorie: enfant.categorie_foot || "", telephone: enfant.telephone_parent || "",
          objet: selection.map(o => o.label).join(" + "), montant: details.reduce((t, d) => t + d.montant, 0),
          moyen, capture: image ? "Oui" : "Non", note: note.trim(), deposePar: auteur || "staff",
        },
      }),
    }).catch(() => {});
    setEnvoi(false);
    await onEnvoye();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-fiver-green/20 bg-fiver-green/[0.04] p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">Paiement pour {enfant.prenom}</p>
        <button onClick={onFermer} className="text-white/40" aria-label="Fermer"><XIcon className="h-4 w-4" /></button>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-fiver-green">Tout est réglé ou déjà en vérification.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {options.map(o => {
              const coche = choix.includes(o.val);
              return (
                <button key={o.val} onClick={() => { setMontantSaisi(null); setChoix(c => coche ? c.filter(x => x !== o.val) : [...c, o.val]); }}
                  className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left", coche ? "border-fiver-green bg-fiver-green/10" : "border-white/10")}>
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", coche ? "border-fiver-green bg-fiver-green text-fiver-black" : "border-white/25")}>
                    {coche && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 text-sm text-white">{o.label}</span>
                  <span className="text-xs text-white/50">{mru(o.reste)}</span>
                </button>
              );
            })}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase text-white/40">Montant reçu (MRU)</p>
            {selection.length === 1 ? (
              <input type="number" inputMode="numeric" value={montantSaisi ?? String(totalDu)} onChange={e => setMontantSaisi(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white" />
            ) : <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">{mru(totalDu)}</p>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MOYENS_PAIEMENT_PARENT.map(m => (
              <button key={m} onClick={() => setMoyen(m)} className={cn("rounded-lg border py-2 text-xs font-semibold", moyen === m ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-white/10 text-white/60")}>{m}</button>
            ))}
          </div>
          <input ref={inputImage} type="file" accept="image/*" className="hidden" onChange={choisirImage} />
          {image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Capture" className="max-h-48 w-full rounded-lg bg-black object-contain" />
              <button onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white" aria-label="Retirer la capture"><XIcon className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => inputImage.current?.click()} className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2.5 text-xs text-white/50">
              <Camera className="h-4 w-4" /> {sansCapture ? "Photo du reçu (facultatif)" : "Ajouter la capture d'écran"}
            </button>
          )}
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (facultatif) : payé au bureau par la maman…"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30" />
          {erreur && <p className="text-xs text-red-300">{erreur}</p>}
          <button onClick={envoyer} disabled={envoi || selection.length === 0} className="flex items-center justify-center gap-2 rounded-lg bg-fiver-green py-2.5 text-sm font-bold text-fiver-black disabled:opacity-50">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Envoyer pour validation — {mru(montant)}
          </button>
          <p className="text-[11px] text-white/40">Le paiement sera validé par l&apos;administrateur, puis le parent sera prévenu.</p>
        </>
      )}
    </div>
  );
}
