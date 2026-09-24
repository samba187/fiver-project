"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarRange, Archive, ArrowRight, Check, Loader2, AlertTriangle, Users, Square, CheckSquare, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { suggestNextSaison } from "@/lib/academy";
import type { Registration, Saison } from "./page";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

interface FeminineInscription {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  statut: string;
  date_naissance: string | null;
  enfant_inscrit: boolean;
  enfant_nom_prenom: string | null;
  notes: string | null;
}

export function TabSaison({
  saisons,
  saisonCourante,
  onRefresh,
}: {
  saisons: Saison[];
  saisonCourante: string;
  registrations: Registration[];
  saisonVue: string;
  onRefresh: () => void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  // Données de la saison à clôturer
  const [academyList, setAcademyList] = useState<Registration[]>([]);
  const [feminineList, setFeminineList] = useState<FeminineInscription[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState<Set<number>>(new Set());
  const [selectedFeminine, setSelectedFeminine] = useState<Set<number>>(new Set());

  // Paramètres de la nouvelle saison
  const [nouveauNom, setNouveauNom] = useState(suggestNextSaison(saisonCourante));
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [facturerFrais, setFacturerFrais] = useState(false);

  useEffect(() => {
    setNouveauNom(suggestNextSaison(saisonCourante));
    const anneeDebut = parseInt(saisonCourante.slice(0, 4), 10) + 1;
    if (!Number.isNaN(anneeDebut)) {
      setDateDebut(`${anneeDebut}-10-01`);
      setDateFin(`${anneeDebut + 1}-09-30`);
    }
  }, [saisonCourante]);

  const loadSaisonData = useCallback(async () => {
    setLoadingData(true);
    const [{ data: acad }, { data: fem }] = await Promise.all([
      supabase.from("academy_registrations").select("*").eq("saison", saisonCourante).order("nom"),
      supabase.from("sport_feminin_inscriptions").select("*").eq("saison", saisonCourante).order("nom"),
    ]);
    setAcademyList((acad as Registration[]) || []);
    setFeminineList((fem as FeminineInscription[]) || []);
    setSelectedAcademy(new Set());
    setSelectedFeminine(new Set());
    setLoadingData(false);
  }, [saisonCourante]);

  function openWizard() {
    setStep(1);
    setError("");
    setWizardOpen(true);
    loadSaisonData();
  }

  function toggleAcademy(id: number) {
    setSelectedAcademy(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleFeminine(id: number) {
    setSelectedFeminine(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function executerCloture() {
    setError("");
    const nom = nouveauNom.trim();
    if (!nom) { setError("Le nom de la nouvelle saison est obligatoire."); return; }
    if (saisons.some(s => s.nom === nom)) { setError(`La saison "${nom}" existe déjà.`); return; }

    setSaving(true);
    try {
      // 1. Créer la nouvelle saison
      const { error: eSaison } = await supabase.from("saisons").insert({
        nom,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        statut: "active",
      });
      if (eSaison) throw eSaison;

      // 2. Réinscrire les enfants sélectionnés (la carte QR est conservée)
      const aReinscrire = academyList.filter(r => selectedAcademy.has(r.id));
      if (aReinscrire.length > 0) {
        const nouvelles = aReinscrire.map(r => ({
          nom: r.nom,
          prenom: r.prenom,
          nom_pere: r.nom_pere,
          date_naissance: r.date_naissance,
          sexe: r.sexe,
          telephone_parent: r.telephone_parent,
          adresse: r.adresse,
          football: r.football,
          centre_loisirs: r.centre_loisirs,
          categorie_foot: r.categorie_foot,
          tarif_football: r.tarif_football,
          tarif_loisirs: r.tarif_loisirs,
          tarif_total: r.tarif_total,
          photo_url: r.photo_url,
          observations: r.observations,
          badge_code: r.badge_code,
          frais_inscription: r.frais_inscription,
          frais_inscription_paye: !facturerFrais,
          montant_paye: 0,
          statut_paiement: "en_attente",
          inscription_fin_de_mois: false,
          saison: nom,
        }));
        const { error: eReinsc } = await supabase.from("academy_registrations").insert(nouvelles);
        if (eReinsc) throw eReinsc;
      }

      // 3. Réinscrire les inscrites Sport Féminin sélectionnées
      const femARein = feminineList.filter(f => selectedFeminine.has(f.id));
      if (femARein.length > 0) {
        const nouvellesFem = femARein.map(f => ({
          nom: f.nom,
          prenom: f.prenom,
          date_naissance: f.date_naissance,
          telephone: f.telephone,
          enfant_inscrit: f.enfant_inscrit,
          enfant_nom_prenom: f.enfant_nom_prenom,
          notes: f.notes,
          statut: "confirmé",
          saison: nom,
        }));
        const { error: eFem } = await supabase.from("sport_feminin_inscriptions").insert(nouvellesFem);
        if (eFem) throw eFem;
      }

      // 4. Archiver l'ancienne saison
      const { error: eArch } = await supabase
        .from("saisons")
        .update({ statut: "archivee", archived_at: new Date().toISOString() })
        .eq("nom", saisonCourante);
      if (eArch) throw eArch;

      // 5. Basculer la saison courante
      const { data: existing } = await supabase.from("settings").select("key").eq("key", "saison_courante").limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("settings").update({ value: nom }).eq("key", "saison_courante");
      } else {
        await supabase.from("settings").insert({ key: "saison_courante", value: nom });
      }

      setDone(`Saison ${nom} lancée — ${aReinscrire.length} enfant(s) et ${femARein.length} inscrite(s) reconduits.`);
      setWizardOpen(false);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Une erreur est survenue pendant la clôture.");
    } finally {
      setSaving(false);
    }
  }

  const saisonActive = saisons.find(s => s.nom === saisonCourante);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {done && (
        <div className="flex items-center gap-3 rounded-lg border border-fiver-green/20 bg-fiver-green/5 px-4 py-3">
          <Check className="h-4 w-4 shrink-0 text-fiver-green" />
          <p className="text-sm text-fiver-green">{done}</p>
        </div>
      )}

      {/* Saison en cours */}
      <div className="rounded-lg border border-fiver-green/20 bg-fiver-green/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-fiver-green" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Saison en cours</h2>
        </div>
        <p className="font-[var(--font-heading)] text-3xl font-bold text-fiver-green">{saisonCourante}</p>
        {saisonActive?.date_debut && (
          <p className="mt-1 text-xs text-white/40">
            Du {new Date(saisonActive.date_debut).toLocaleDateString("fr-FR")}
            {saisonActive.date_fin ? ` au ${new Date(saisonActive.date_fin).toLocaleDateString("fr-FR")}` : ""}
          </p>
        )}
        <button
          onClick={openWizard}
          className="mt-5 flex items-center gap-2 rounded-sm bg-fiver-green px-5 py-3 text-sm font-bold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90"
        >
          Clôturer et lancer la nouvelle saison <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Explication */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Ce que fait la clôture</h3>
        <ul className="flex flex-col gap-2 text-xs text-white/60">
          <li>— Aucune donnée n&apos;est supprimée : la saison passée reste consultable via le sélecteur en haut de page.</li>
          <li>— Les enfants que vous cochez sont réinscrits dans la nouvelle saison avec leurs infos, leur photo et <strong className="text-white">leur carte QR actuelle</strong> (pas besoin de réimprimer).</li>
          <li>— Les paiements mensuels repartent à zéro pour la nouvelle saison.</li>
          <li>— Le module Navette redémarre vide : les réservations se font séance par séance.</li>
        </ul>
      </div>

      {/* Historique */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive className="h-4 w-4 text-white/40" />
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Historique des saisons</h2>
        </div>
        <div className="flex flex-col gap-2">
          {saisons.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-sm border border-white/5 bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">{s.nom}</p>
                {s.date_debut && (
                  <p className="text-[11px] text-white/30">
                    {new Date(s.date_debut).toLocaleDateString("fr-FR")}
                    {s.date_fin ? ` → ${new Date(s.date_fin).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                )}
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                s.statut === "active" ? "bg-fiver-green/15 text-fiver-green" : "bg-white/5 text-white/40"
              )}>
                {s.statut === "active" ? "En cours" : "Archivée"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ====== WIZARD DE CLÔTURE ====== */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded-lg border border-white/10 bg-[#111] p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">
                  Clôture de la saison {saisonCourante}
                </h3>
                <p className="mt-1 text-xs text-white/40">Étape {step} sur 3</p>
              </div>
              <button onClick={() => setWizardOpen(false)} className="text-white/40 hover:text-white">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* ÉTAPE 1 — Nouvelle saison */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Nom de la nouvelle saison</label>
                  <input value={nouveauNom} onChange={e => setNouveauNom(e.target.value)} className={inputClass} placeholder="2026-2027" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Date de début</label>
                    <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/40">Date de fin</label>
                    <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <input type="checkbox" checked={facturerFrais} onChange={e => setFacturerFrais(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00c26e]" />
                  <span>
                    <span className="block text-sm font-medium text-white">Facturer les frais d&apos;inscription aux réinscrits</span>
                    <span className="mt-0.5 block text-[11px] text-white/40">
                      Si décoché, les enfants reconduits repartent avec leurs frais d&apos;inscription déjà considérés comme réglés.
                    </span>
                  </span>
                </label>
                <button onClick={() => setStep(2)} className="mt-2 flex items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black">
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ÉTAPE 2 — Sélection des réinscrits */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                {loadingData ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>
                ) : (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-fiver-green" />
                          <h4 className="text-sm font-bold text-white">Academy / Loisirs ({academyList.length})</h4>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedAcademy(new Set(academyList.map(r => r.id)))} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout cocher</button>
                          <button onClick={() => setSelectedAcademy(new Set())} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout décocher</button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-sm border border-white/5">
                        {academyList.map(r => {
                          const checked = selectedAcademy.has(r.id);
                          return (
                            <button
                              key={r.id}
                              onClick={() => toggleAcademy(r.id)}
                              className={cn("flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors", checked ? "bg-fiver-green/10" : "hover:bg-white/5")}
                            >
                              {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-fiver-green" /> : <Square className="h-4 w-4 shrink-0 text-white/20" />}
                              <span className="flex-1 truncate text-sm text-white/80">{r.prenom} {r.nom}</span>
                              {r.categorie_foot && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white/50">{r.categorie_foot}</span>}
                            </button>
                          );
                        })}
                        {academyList.length === 0 && <p className="px-3 py-6 text-center text-xs text-white/30">Aucun inscrit dans cette saison.</p>}
                      </div>
                    </div>

                    {feminineList.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">Sport Féminin ({feminineList.length})</h4>
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedFeminine(new Set(feminineList.map(f => f.id)))} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout cocher</button>
                            <button onClick={() => setSelectedFeminine(new Set())} className="rounded-sm bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10">Tout décocher</button>
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto rounded-sm border border-white/5">
                          {feminineList.map(f => {
                            const checked = selectedFeminine.has(f.id);
                            return (
                              <button
                                key={f.id}
                                onClick={() => toggleFeminine(f.id)}
                                className={cn("flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors", checked ? "bg-fiver-green/10" : "hover:bg-white/5")}
                              >
                                {checked ? <CheckSquare className="h-4 w-4 shrink-0 text-fiver-green" /> : <Square className="h-4 w-4 shrink-0 text-white/20" />}
                                <span className="flex-1 truncate text-sm text-white/80">{f.prenom} {f.nom}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="rounded-sm bg-white/5 px-5 py-3 text-sm font-medium text-white/60 hover:bg-white/10">Retour</button>
                      <button onClick={() => setStep(3)} className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black">
                        Continuer <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ÉTAPE 3 — Confirmation */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Récapitulatif</h4>
                  <ul className="flex flex-col gap-2 text-sm text-white/70">
                    <li>Saison <strong className="text-white">{saisonCourante}</strong> → archivée (consultable à tout moment)</li>
                    <li>Nouvelle saison <strong className="text-fiver-green">{nouveauNom}</strong> → active</li>
                    <li><strong className="text-white">{selectedAcademy.size}</strong> enfant(s) réinscrit(s) sur {academyList.length}</li>
                    {feminineList.length > 0 && <li><strong className="text-white">{selectedFeminine.size}</strong> inscrite(s) Sport Féminin reconduite(s)</li>}
                    <li>Frais d&apos;inscription : <strong className="text-white">{facturerFrais ? "à facturer" : "considérés comme réglés"}</strong></li>
                  </ul>
                </div>
                <div className="flex items-start gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-[11px] text-amber-300/80">
                    Les enfants non cochés ne seront pas supprimés : ils resteront dans l&apos;archive {saisonCourante} et pourront être réinscrits manuellement plus tard.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={saving} className="rounded-sm bg-white/5 px-5 py-3 text-sm font-medium text-white/60 hover:bg-white/10">Retour</button>
                  <button
                    onClick={executerCloture}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50"
                  >
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Clôture en cours...</> : <><Check className="h-4 w-4" /> Confirmer et lancer {nouveauNom}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
