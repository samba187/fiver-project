"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut, Camera, Upload, FileText, CalendarDays, Images, ClipboardCheck, MessageCircle, Bell,
  ChevronLeft, Loader2, Check, X as XIcon, Clock, Download, Send, CircleCheck, CircleAlert, Copy, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  appelParent, statutMoisEnfant, fraisEnVerification, libelleMois, libelleDepot, imageEnDataUrl, LIBELLE_STATUT,
  MOYENS_PAIEMENT_PARENT, MOYENS_SANS_CAPTURE, NUMERO_PAIEMENT_DEFAUT, lireVus, marquerVu, notificationsEnfant, nouvellesAnnonces,
  type DonneesParent, type EnfantParent, type StatutMois, type Vus,
} from "@/lib/parents";
import {
  currentMonthStr, moisDeSaison, seancesEntre, dateLocale, decalerJours, estArrete, JOURS_LONGS,
} from "@/lib/academy";
import { RecuAcademy, lignesRecu, recuEnPdf } from "@/components/academy/recu-academy";

type Vue = "accueil" | "paiement" | "factures" | "entrainements" | "photos" | "suivi" | "messages";

const STYLE_STATUT: Record<StatutMois, { carte: string; texte: string }> = {
  paye: { carte: "border-fiver-green/30 bg-fiver-green/10", texte: "text-fiver-green" },
  offert: { carte: "border-sky-400/30 bg-sky-400/10", texte: "text-sky-300" },
  partiel: { carte: "border-amber-400/30 bg-amber-400/10", texte: "text-amber-300" },
  a_payer: { carte: "border-amber-400/30 bg-amber-400/10", texte: "text-amber-300" },
  a_venir: { carte: "border-white/10 bg-white/[0.04]", texte: "text-white/70" },
  retard: { carte: "border-red-500/30 bg-red-500/10", texte: "text-red-300" },
  avant_saison: { carte: "border-white/10 bg-white/[0.04]", texte: "text-white/40" },
  en_verification: { carte: "border-sky-400/30 bg-sky-400/10", texte: "text-sky-300" },
  arrete: { carte: "border-red-500/30 bg-red-500/10", texte: "text-red-300" },
};

function moisSuivant(mois: string) {
  const d = new Date(mois + "-01T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return currentMonthStr(d);
}

function dateCourte(date: string) {
  const d = new Date(date + "T00:00:00");
  const l = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

const mru = (n: number) => `${n.toLocaleString("fr-FR")} MRU`;

function PhotoEnfant({ e, taille = "h-16 w-16" }: { e: EnfantParent; taille?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full border-2 border-fiver-green/40 bg-white/5", taille)}>
      {e.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white/40">{e.prenom[0]}{e.nom[0]}</div>
      )}
    </div>
  );
}

function EnTete({ titre, onRetour }: { titre: string; onRetour: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <button onClick={onRetour} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70" aria-label="Retour">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="font-[var(--font-heading)] text-xl font-bold uppercase text-white">{titre}</h2>
    </div>
  );
}

export function EspaceParent({ donnees, onRecharger, onDeconnexion }: { donnees: DonneesParent; onRecharger: () => Promise<void>; onDeconnexion: () => void }) {
  const [vue, setVue] = useState<Vue>("accueil");
  const [enfantId, setEnfantId] = useState<number | null>(donnees.enfants[0]?.id ?? null);
  const enfant = donnees.enfants.find(e => e.id === enfantId) || donnees.enfants[0] || null;
  const nonLus = donnees.messages.filter(m => m.sens === "academie" && !m.lu).length;
  const tel = donnees.parent.telephone;
  const [vus, setVus] = useState<Vus>(() => lireVus(tel));
  const marquer = (cle: string) => setVus(v => marquerVu(tel, v, cle));

  useEffect(() => { window.scrollTo(0, 0); }, [vue]);

  // Ouvrir une rubrique la marque comme vue pour cet enfant
  useEffect(() => {
    if (!enfant) return;
    if (vue === "paiement") marquer(`paiements:${enfant.id}`);
    if (vue === "photos") marquer(`photos:${enfant.id}`);
    if (vue === "suivi") marquer(`suivi:${enfant.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vue, enfant?.id]);

  const retour = () => setVue("accueil");
  const ouvrir = (v: Vue, idEnfant?: number) => { if (idEnfant) setEnfantId(idEnfant); setVue(v); };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-5">
      {vue === "accueil" && (
        <Accueil donnees={donnees} enfant={enfant} setEnfantId={setEnfantId} ouvrir={ouvrir} nonLus={nonLus} vus={vus} onAnnoncesVues={() => marquer("annonces")} onRecharger={onRecharger} onDeconnexion={onDeconnexion} />
      )}
      {vue === "paiement" && enfant && <VuePaiement donnees={donnees} enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "factures" && enfant && <VueFactures enfant={enfant} onRetour={retour} />}
      {vue === "entrainements" && enfant && <VueEntrainements donnees={donnees} enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "photos" && enfant && <VuePhotos donnees={donnees} enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "suivi" && enfant && <VueSuivi donnees={donnees} enfant={enfant} onRetour={retour} />}
      {vue === "messages" && <VueMessages donnees={donnees} onRetour={retour} onRecharger={onRecharger} />}
    </div>
  );
}

// ======================= ACCUEIL =======================

function Accueil({ donnees, enfant, setEnfantId, ouvrir, nonLus, vus, onAnnoncesVues, onRecharger, onDeconnexion }: {
  donnees: DonneesParent; enfant: EnfantParent | null; setEnfantId: (id: number) => void; ouvrir: (v: Vue, idEnfant?: number) => void;
  nonLus: number; vus: Vus; onAnnoncesVues: () => void; onRecharger: () => Promise<void>; onDeconnexion: () => void;
}) {
  const setVue = (v: Vue) => ouvrir(v);
  const inputPhoto = useRef<HTMLInputElement>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [cloche, setCloche] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState("");
  const moisActuel = currentMonthStr();

  async function changerPhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file || !enfant) return;
    setEnvoiPhoto(true);
    setErreurPhoto("");
    try {
      const image = await imageEnDataUrl(file, 600);
      await appelParent("parent_maj_photo", { p_registration_id: enfant.id, p_image: image });
      await onRecharger();
    } catch (e) {
      setErreurPhoto(e instanceof Error ? e.message : "Envoi impossible.");
    }
    setEnvoiPhoto(false);
  }

  // Notifications : décisions sur les paiements, nouvelles photos / évaluations, messages, annonces
  const notifs = enfant ? notificationsEnfant(enfant, vus) : null;
  const annoncesNeuves = nouvellesAnnonces(donnees, vus);
  const elements: { cle: string; texte: string; action: () => void; ton?: "ok" | "ko" }[] = [];
  if (nonLus > 0) elements.push({ cle: "msg", texte: `${nonLus} nouveau${nonLus > 1 ? "x" : ""} message${nonLus > 1 ? "s" : ""} de l'académie`, action: () => ouvrir("messages") });
  for (const e of donnees.enfants) {
    const n = notificationsEnfant(e, vus);
    for (const p of n.paiements) {
      elements.push({
        cle: `p${p.id}`, ton: p.statut === "valide" ? "ok" : "ko", action: () => ouvrir("paiement", e.id),
        texte: `${e.prenom} : paiement ${p.statut === "valide" ? "validé" : "refusé"} (${libelleDepot(p)})`,
      });
    }
    if (n.photos > 0) elements.push({ cle: `ph${e.id}`, texte: `${n.photos} nouvelle${n.photos > 1 ? "s" : ""} photo${n.photos > 1 ? "s" : ""} de ${e.prenom}`, action: () => ouvrir("photos", e.id) });
    if (n.evaluations > 0) elements.push({ cle: `ev${e.id}`, texte: `Nouvelle évaluation pour ${e.prenom}`, action: () => ouvrir("suivi", e.id) });
  }
  for (const a of annoncesNeuves) elements.push({ cle: `a${a.id}`, texte: `Annonce : ${a.titre}`, action: () => { setCloche(false); onAnnoncesVues(); } });

  function fermerCloche() {
    setCloche(false);
    if (annoncesNeuves.length > 0) onAnnoncesVues();
  }

  const services: { vue: Vue; label: string; icon: typeof Upload; badge?: number }[] = [
    { vue: "paiement", label: "Déposer un paiement", icon: Upload, badge: notifs?.paiements.length },
    { vue: "factures", label: "Mes factures", icon: FileText },
    { vue: "entrainements", label: "Entraînements", icon: CalendarDays },
    { vue: "photos", label: "Mes photos", icon: Images, badge: notifs?.photos },
    { vue: "suivi", label: "Suivi sportif", icon: ClipboardCheck, badge: notifs?.evaluations },
    { vue: "messages", label: "Messages", icon: MessageCircle, badge: nonLus },
  ];

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fiver-green">Fiveur Academy</p>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-white">Espace Parents</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => (cloche ? fermerCloche() : setCloche(true))} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {elements.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{elements.length}</span>
            )}
          </button>
          <button onClick={onDeconnexion} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60" aria-label="Se déconnecter">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {cloche && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-[#141414] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-white">Notifications</p>
            <button onClick={fermerCloche} className="text-white/40" aria-label="Fermer"><XIcon className="h-4 w-4" /></button>
          </div>
          {elements.length === 0 ? (
            <p className="px-1 py-2 text-sm text-white/40">Rien de nouveau pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {elements.map(el => (
                <button key={el.cle} onClick={el.action} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-white/85 active:bg-white/5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", el.ton === "ko" ? "bg-red-400" : "bg-fiver-green")} />
                  {el.texte}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {donnees.enfants.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {donnees.enfants.map(e => (
            <button
              key={e.id}
              onClick={() => setEnfantId(e.id)}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", enfant?.id === e.id ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/60")}
            >
              {e.prenom}
            </button>
          ))}
        </div>
      )}

      {!enfant ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
          Aucun enfant inscrit pour la saison {donnees.saison} avec le numéro {donnees.parent.telephone}. Contactez l&apos;académie si c&apos;est une erreur.
        </div>
      ) : (
        <>
          {/* Carte enfant */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Mon enfant</p>
            <div className="flex items-center gap-4">
              <button onClick={() => inputPhoto.current?.click()} className="relative" aria-label="Changer la photo">
                <PhotoEnfant e={enfant} />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-fiver-green text-fiver-black">
                  {envoiPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </span>
              </button>
              <input ref={inputPhoto} type="file" accept="image/*" className="hidden" onChange={changerPhoto} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-white">{enfant.prenom} {enfant.nom}</p>
                <p className="text-sm text-white/50">Catégorie {enfant.categorie_foot || "—"} · Saison {enfant.saison}</p>
              </div>
              {estArrete(enfant)
                ? <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">Arrêté</span>
                : <span className="rounded-full bg-fiver-green/15 px-3 py-1 text-xs font-bold text-fiver-green">Inscrit</span>}
            </div>
            {erreurPhoto && <p className="mt-2 text-xs text-red-300">{erreurPhoto}</p>}
          </div>

          {/* Mois en cours / suivant */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[moisActuel, moisSuivant(moisActuel)].map(m => {
              const s = statutMoisEnfant(enfant, m, donnees.tarifs);
              const st = STYLE_STATUT[s.statut];
              return (
                <button key={m} onClick={() => setVue("paiement")} className={cn("rounded-2xl border p-4 text-left", st.carte)}>
                  {s.statut === "paye" || s.statut === "offert" ? <CircleCheck className={cn("h-5 w-5", st.texte)} />
                    : s.statut === "retard" ? <CircleAlert className={cn("h-5 w-5", st.texte)} />
                    : <Clock className={cn("h-5 w-5", st.texte)} />}
                  <p className="mt-2 text-sm text-white/60">{libelleMois(m)}</p>
                  <p className={cn("text-xl font-bold", st.texte)}>{LIBELLE_STATUT[s.statut]}</p>
                  {(s.statut === "a_payer" || s.statut === "retard" || s.statut === "partiel") && (
                    <p className="text-xs text-white/50">{mru(Math.max(0, s.du - s.paye))} à régler</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mois passés pas encore réglés : bien visibles */}
          {(() => {
            const retards = moisDeSaison(enfant.saison)
              .filter(m => m < moisActuel)
              .map(m => ({ m, ...statutMoisEnfant(enfant, m, donnees.tarifs) }))
              .filter(x => x.statut === "retard" || x.statut === "partiel");
            if (retards.length === 0) return null;
            const total = retards.reduce((s, x) => s + Math.max(0, x.du - x.paye), 0);
            return (
              <button onClick={() => setVue("paiement")} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left">
                <span>
                  <span className="block text-sm font-bold text-red-200">
                    {retards.length === 1 ? "1 mois en retard" : `${retards.length} mois en retard`}
                  </span>
                  <span className="block text-xs text-white/60">{retards.map(x => libelleMois(x.m)).join(", ")} · {mru(total)} à régler</span>
                </span>
                <CircleAlert className="h-5 w-5 shrink-0 text-red-300" />
              </button>
            );
          })()}

          {!enfant.frais_inscription_paye && (
            <button onClick={() => setVue("paiement")} className={cn("mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left", fraisEnVerification(enfant) ? "border-sky-400/30 bg-sky-400/10" : "border-amber-400/30 bg-amber-400/10")}>
              <span>
                <span className={cn("block text-sm font-bold", fraisEnVerification(enfant) ? "text-sky-200" : "text-amber-200")}>Frais d&apos;inscription</span>
                <span className="block text-xs text-white/50">{fraisEnVerification(enfant) ? "Paiement en vérification" : `${mru(enfant.frais_inscription)} à régler`}</span>
              </span>
              <Upload className="h-5 w-5 text-amber-200" />
            </button>
          )}
        </>
      )}

      {/* Services */}
      <h3 className="mb-3 mt-6 font-[var(--font-heading)] text-lg font-bold uppercase text-white">Mes services</h3>
      <div className="grid grid-cols-3 gap-2.5">
        {services.filter(s => enfant || s.vue === "messages").map(s => (
          <button
            key={s.vue}
            onClick={() => setVue(s.vue)}
            className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] p-2 text-center active:bg-white/10"
          >
            <s.icon className="h-6 w-6 text-fiver-green" />
            <span className="text-[13px] font-medium leading-tight text-white/85">{s.label}</span>
            {!!s.badge && (
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-fiver-green px-1.5 text-[11px] font-bold text-fiver-black">{s.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Informations de l'académie */}
      <div className="mt-6 rounded-2xl border border-fiver-green/20 bg-fiver-green/5 p-4">
        <p className="flex items-center gap-2 font-bold text-fiver-green"><Bell className="h-4 w-4" /> Informations de l&apos;académie</p>
        {donnees.annonces.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">Aucune annonce pour le moment.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {donnees.annonces.slice(0, 5).map(a => (
              <div key={a.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                <p className="text-sm font-semibold text-white">
                  {a.titre}
                  {annoncesNeuves.some(n => n.id === a.id) && <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">Nouveau</span>}
                </p>
                {a.contenu && <p className="mt-0.5 whitespace-pre-line text-sm text-white/60">{a.contenu}</p>}
                {!!a.photos?.length && <PhotosAnnonce photos={a.photos} />}
                <p className="mt-1 text-[11px] text-white/30">{new Date(a.created_at).toLocaleDateString("fr-FR")}{a.categorie ? ` · ${a.categorie}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ======================= PAIEMENT =======================

function VuePaiement({ donnees, enfant, onRetour, onRecharger }: { donnees: DonneesParent; enfant: EnfantParent; onRetour: () => void; onRecharger: () => Promise<void> }) {
  const moisActuel = currentMonthStr();
  // Tout ce qui reste à payer sur la saison : frais + mois non réglés (y compris les mois à venir, pour payer d'avance)
  const options = useMemo(() => {
    const opts: { val: string; label: string; reste: number }[] = [];
    if (!enfant.frais_inscription_paye && !fraisEnVerification(enfant)) opts.push({ val: "FRAIS", label: "Frais d'inscription", reste: enfant.frais_inscription });
    for (const m of moisDeSaison(enfant.saison)) {
      const s = statutMoisEnfant(enfant, m, donnees.tarifs);
      if (["a_payer", "retard", "partiel", "a_venir"].includes(s.statut)) {
        opts.push({ val: m, label: libelleMois(m), reste: Math.max(0, s.du - s.paye) });
      }
    }
    return opts.filter(o => o.reste > 0);
  }, [enfant, donnees.tarifs]);

  const [choix, setChoix] = useState<string[]>(() => {
    const defaut = options.find(o => o.val === moisActuel) || options.find(o => o.val !== "FRAIS") || options[0];
    return defaut ? [defaut.val] : [];
  });
  const [montantSaisi, setMontantSaisi] = useState<string | null>(null);
  const [moyen, setMoyen] = useState("Bankily");
  const [image, setImage] = useState("");
  const [note, setNote] = useState("");
  const [copie, setCopie] = useState(false);
  const numero = donnees.tarifs?.numeroPaiement || NUMERO_PAIEMENT_DEFAUT;
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const inputImage = useRef<HTMLInputElement>(null);

  const selection = options.filter(o => choix.includes(o.val));
  const totalDu = selection.reduce((s, o) => s + o.reste, 0);
  // Montant modifiable seulement pour un seul mois (paiement partiel)
  const montant = selection.length === 1 && montantSaisi !== null ? parseInt(montantSaisi) || 0 : totalDu;
  const sansCapture = MOYENS_SANS_CAPTURE.includes(moyen);

  function basculer(val: string) {
    setMontantSaisi(null);
    setChoix(c => c.includes(val) ? c.filter(x => x !== val) : [...c, val]);
  }

  async function choisirImage(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    try { setImage(await imageEnDataUrl(file, 1200)); } catch { setMessage({ ok: false, texte: "Image illisible." }); }
  }

  async function envoyer() {
    setMessage(null);
    if (selection.length === 0 || !(montant > 0)) {
      setMessage({ ok: false, texte: "Choisissez au moins un mois à payer." });
      return;
    }
    if (!image && !sansCapture) {
      setMessage({ ok: false, texte: "Ajoutez la capture d'écran du paiement." });
      return;
    }
    const details = selection.length === 1
      ? [{ mois: selection[0].val, montant }]
      : selection.map(o => ({ mois: o.val, montant: o.reste }));
    setEnvoi(true);
    try {
      await appelParent("parent_deposer_paiement", {
        p_registration_id: enfant.id, p_details: details, p_moyen: moyen, p_image: image || null, p_note: note.trim() || null,
      });
      // Prévenir l'académie par e-mail (sans bloquer le parent si l'envoi échoue)
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "paiement_parent",
          origin: window.location.origin,
          data: {
            enfant: `${enfant.prenom} ${enfant.nom}`, categorie: enfant.categorie_foot || "", telephone: donnees.parent.telephone,
            objet: selection.map(o => o.label).join(" + "), montant: details.reduce((t, d) => t + d.montant, 0),
            moyen, capture: image ? "Oui" : "Non", note: note.trim(),
          },
        }),
      }).catch(() => {});
      setImage("");
      setNote("");
      setChoix([]);
      setMontantSaisi(null);
      setMessage({ ok: true, texte: sansCapture ? "Paiement déclaré. L'académie le validera à réception." : "Paiement envoyé. L'académie va le vérifier." });
      await onRecharger();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Envoi impossible." });
    }
    setEnvoi(false);
  }

  const STATUT_PREUVE = {
    en_attente: { label: "En vérification", cls: "bg-amber-400/15 text-amber-300" },
    valide: { label: "Validé", cls: "bg-fiver-green/15 text-fiver-green" },
    refuse: { label: "Refusé", cls: "bg-red-500/15 text-red-300" },
  };

  return (
    <>
      <EnTete titre="Déposer un paiement" onRetour={onRetour} />
      <p className="mb-4 text-sm text-white/50">{enfant.prenom} {enfant.nom}</p>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-fiver-green/20 bg-fiver-green/5 p-4 text-sm text-fiver-green">
          {message?.ok ? message.texte : "Tout est réglé pour le moment."}
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Je paie pour <span className="normal-case text-white/30">(plusieurs choix possibles)</span></p>
            <div className="flex flex-col gap-1.5">
              {options.map(o => {
                const coche = choix.includes(o.val);
                return (
                  <button key={o.val} onClick={() => basculer(o.val)}
                    className={cn("flex items-center gap-3 rounded-lg border px-3 py-3 text-left", coche ? "border-fiver-green bg-fiver-green/10" : "border-white/10 bg-white/[0.02]")}>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", coche ? "border-fiver-green bg-fiver-green text-fiver-black" : "border-white/25")}>
                      {coche && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("flex-1 text-sm font-semibold", coche ? "text-white" : "text-white/70")}>
                      {o.label}{o.val === moisActuel && <span className="ml-2 text-[11px] font-normal text-white/40">mois en cours</span>}
                    </span>
                    <span className="text-sm text-white/60">{mru(o.reste)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Montant payé (MRU)</p>
            {selection.length === 1 ? (
              <input type="number" inputMode="numeric" value={montantSaisi ?? String(totalDu)} onChange={e => setMontantSaisi(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-base font-bold text-white" />
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-base font-bold text-white">
                {mru(totalDu)} {selection.length > 1 && <span className="text-xs font-normal text-white/40">pour {selection.length} éléments</span>}
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Moyen de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {MOYENS_PAIEMENT_PARENT.map(m => (
                <button key={m} onClick={() => setMoyen(m)} className={cn("rounded-lg border py-2.5 text-sm font-semibold", moyen === m ? "border-fiver-green bg-fiver-green/10 text-fiver-green" : "border-white/10 text-white/60")}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {!sansCapture && (
            <div className="rounded-lg border border-fiver-green/25 bg-fiver-green/5 p-3">
              <p className="text-xs text-white/60">Envoyez le paiement {moyen} au numéro :</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xl font-black tracking-wider text-fiver-green"><Smartphone className="h-5 w-5" /> {numero}</p>
                <button
                  onClick={() => { navigator.clipboard?.writeText(numero.replace(/\s/g, "")).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1500); }).catch(() => {}); }}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80"
                >
                  {copie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copie ? "Copié" : "Copier"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-white/40">Puis ajoutez la capture d&apos;écran ci-dessous.</p>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              Capture d&apos;écran du paiement{sansCapture && <span className="normal-case text-white/30"> (facultatif)</span>}
            </p>
            {sansCapture && !image && (
              <p className="mb-2 rounded-lg bg-white/[0.04] px-3 py-2.5 text-xs text-white/60">
                Pas besoin de capture pour un paiement {moyen === "Cash" ? "en espèces" : "par un autre moyen"} : l&apos;académie validera à réception.
              </p>
            )}
            <input ref={inputImage} type="file" accept="image/*" className="hidden" onChange={choisirImage} />
            {image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Capture" className="max-h-72 w-full rounded-lg object-contain bg-black" />
                <button onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"><XIcon className="h-4 w-4" /></button>
              </div>
            ) : (
              <button onClick={() => inputImage.current?.click()} className={cn("flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/15 text-sm text-white/50", sansCapture ? "py-3" : "flex-col py-8")}>
                <Camera className="h-6 w-6" /> {sansCapture ? "Ajouter une photo du reçu" : "Ajouter la capture"}
              </button>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Note pour l&apos;académie <span className="normal-case text-white/30">(facultatif)</span></p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
              placeholder="Ex : payé par le papa, numéro 22 33 44 55"
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
          </div>
          {message && <p className={cn("text-sm", message.ok ? "text-fiver-green" : "text-red-300")}>{message.texte}</p>}
          <button onClick={envoyer} disabled={envoi || selection.length === 0} className="flex items-center justify-center gap-2 rounded-lg bg-fiver-green py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {selection.length > 1 ? `Envoyer — ${mru(totalDu)}` : "Envoyer"}
          </button>
        </div>
      )}

      {enfant.preuves.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Mes dépôts</h3>
          <div className="flex flex-col gap-2">
            {enfant.preuves.map(p => (
              <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{libelleDepot(p)}</p>
                    <p className="text-xs text-white/40">{mru(p.montant)} · {p.moyen_paiement} · {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUT_PREUVE[p.statut].cls)}>{STATUT_PREUVE[p.statut].label}</span>
                </div>
                {p.note && <p className="mt-1.5 text-xs text-white/50">Votre note : {p.note}</p>}
                {p.statut === "refuse" && p.motif_refus && <p className="mt-2 text-xs text-red-300">Motif : {p.motif_refus}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ======================= FACTURES =======================

// Même reçu que celui envoyé par l'académie depuis la fiche de l'inscrit
function VueFactures({ enfant, onRetour }: { enfant: EnfantParent; onRetour: () => void }) {
  const lignes = useMemo(() => lignesRecu(enfant), [enfant]);
  const [choix, setChoix] = useState<string[]>(() => lignes.map(l => l.id));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const recuRef = useRef<HTMLDivElement>(null);
  const selection = lignes.filter(l => choix.includes(l.id));

  async function telecharger() {
    if (!recuRef.current || selection.length === 0) return;
    setEnCours(true);
    setErreur("");
    try {
      const pdf = await recuEnPdf(recuRef.current);
      pdf.save(`Facture_Academy_${enfant.prenom}_${enfant.nom}.pdf`);
    } catch {
      setErreur("Téléchargement impossible. Réessayez.");
    }
    setEnCours(false);
  }

  return (
    <>
      <EnTete titre="Mes factures" onRetour={onRetour} />
      <p className="mb-4 text-sm text-white/50">{enfant.prenom} {enfant.nom} · saison {enfant.saison}</p>
      {lignes.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">Aucun paiement enregistré pour cette saison.</p>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Paiements à inclure dans le reçu</p>
          <div className="flex flex-col gap-1.5">
            {lignes.map(l => {
              const coche = choix.includes(l.id);
              return (
                <button key={l.id} onClick={() => setChoix(c => coche ? c.filter(x => x !== l.id) : [...c, l.id])}
                  className={cn("flex items-center gap-3 rounded-lg border px-3 py-3 text-left", coche ? "border-fiver-green bg-fiver-green/10" : "border-white/10 bg-white/[0.02]")}>
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", coche ? "border-fiver-green bg-fiver-green text-fiver-black" : "border-white/25")}>
                    {coche && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{l.label}</span>
                    <span className="block text-xs text-white/40">{l.method} · {l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—"}</span>
                  </span>
                  <span className="text-sm font-bold text-white/80">{mru(l.amount)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Total</span>
            <span className="text-lg font-black text-fiver-green">{mru(selection.reduce((s, l) => s + l.amount, 0))}</span>
          </div>
          {erreur && <p className="mt-2 text-sm text-red-300">{erreur}</p>}
          <button onClick={telecharger} disabled={enCours || selection.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-fiver-green py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50">
            {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger le reçu
          </button>

          {/* Reçu rendu hors écran pour la génération du PDF */}
          {selection.length > 0 && (
            <div style={{ position: "fixed", top: "-9999px", left: "-9999px", zIndex: -100 }} aria-hidden>
              <div ref={recuRef} style={{ width: "600px" }}>
                <RecuAcademy joueur={enfant} lignes={selection} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ======================= ENTRAÎNEMENTS =======================

function VueEntrainements({ donnees, enfant, onRetour, onRecharger }: { donnees: DonneesParent; enfant: EnfantParent; onRetour: () => void; onRecharger: () => Promise<void> }) {
  const aujourdhui = dateLocale();
  const creneau = enfant.categorie_foot ? donnees.planning[enfant.categorie_foot] : undefined;
  const prochaines = seancesEntre(donnees.planning, enfant.categorie_foot, aujourdhui, decalerJours(aujourdhui, 21));
  const passees = seancesEntre(donnees.planning, enfant.categorie_foot, decalerJours(aujourdhui, -30), decalerJours(aujourdhui, -1)).reverse();
  const parDate = new Map(enfant.seances.map(s => [s.date, s]));
  const scans = new Set(enfant.scans);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  async function repondre(date: string, reponse: "present" | "absent") {
    const actuelle = parDate.get(date)?.reponse || null;
    setEnCours(date);
    setErreur("");
    try {
      await appelParent("parent_repondre_seance", { p_registration_id: enfant.id, p_date: date, p_reponse: actuelle === reponse ? null : reponse });
      await onRecharger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
    setEnCours(null);
  }

  return (
    <>
      <EnTete titre="Entraînements" onRetour={onRetour} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Planning {enfant.categorie_foot}</p>
        {creneau && creneau.jours.length > 0 ? (
          <>
            <p className="mt-1 text-lg font-bold capitalize text-white">{[...creneau.jours].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(j => JOURS_LONGS[j]).join(" · ")}</p>
            <p className="text-sm text-white/60">{[creneau.heure, creneau.terrain].filter(Boolean).join(" · ")}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-white/50">Planning pas encore défini pour cette catégorie.</p>
        )}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Prochaines séances</h3>
      <p className="mb-3 text-xs text-white/40">Indiquez si {enfant.prenom} sera présent(e).</p>
      {erreur && <p className="mb-2 text-sm text-red-300">{erreur}</p>}
      <div className="flex flex-col gap-2">
        {prochaines.length === 0 && <p className="text-sm text-white/40">Aucune séance prévue.</p>}
        {prochaines.map(d => {
          const rep = parDate.get(d)?.reponse || null;
          return (
            <div key={d} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="min-w-0 flex-1 text-sm font-semibold text-white">{dateCourte(d)}{d === aujourdhui && <span className="ml-1.5 text-xs text-fiver-green">aujourd&apos;hui</span>}</p>
              {enCours === d ? <Loader2 className="h-4 w-4 animate-spin text-fiver-green" /> : (
                <>
                  <button onClick={() => repondre(d, "present")} className={cn("flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold", rep === "present" ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/50")}>
                    <Check className="h-3.5 w-3.5" /> Présent
                  </button>
                  <button onClick={() => repondre(d, "absent")} className={cn("flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold", rep === "absent" ? "bg-red-500 text-white" : "bg-white/5 text-white/50")}>
                    <XIcon className="h-3.5 w-3.5" /> Absent
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {passees.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Séances passées</h3>
          <div className="flex flex-col gap-1.5">
            {passees.map(d => {
              const reel = parDate.get(d)?.presence || (scans.has(d) ? "present" : null);
              return (
                <div key={d} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5 text-sm">
                  <span className="text-white/70">{dateCourte(d)}</span>
                  <span className={cn("text-xs font-bold", reel === "present" ? "text-fiver-green" : reel === "absent" ? "text-red-300" : "text-white/30")}>
                    {reel === "present" ? "Présent" : reel === "absent" ? "Absent" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ======================= PHOTOS =======================

function PhotosAnnonce({ photos }: { photos: string[] }) {
  return (
    <div className={cn("mt-2 grid gap-1.5", photos.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {photos.map(url => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className={cn("overflow-hidden rounded-xl bg-white/5", photos.length === 1 ? "aspect-video" : "aspect-square")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

function VuePhotos({ donnees, enfant, onRetour, onRecharger }: { donnees: DonneesParent; enfant: EnfantParent; onRetour: () => void; onRecharger: () => Promise<void> }) {
  const groupe = donnees.annonces.filter(a => a.photos?.length);
  const [maj, setMaj] = useState(false);
  async function basculer() {
    setMaj(true);
    try {
      await appelParent("parent_autorisation_photos", { p_registration_id: enfant.id, p_autorise: !enfant.autorisation_photos });
      await onRecharger();
    } finally { setMaj(false); }
  }
  return (
    <>
      <EnTete titre="Mes photos" onRetour={onRetour} />
      <button onClick={basculer} disabled={maj} className="mb-5 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <span>
          <span className="block text-sm font-semibold text-white">Autoriser les photos de {enfant.prenom}</span>
          <span className="block text-xs text-white/40">Photos prises par les coachs pendant les activités</span>
        </span>
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", enfant.autorisation_photos ? "bg-fiver-green" : "bg-white/15")}>
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", enfant.autorisation_photos ? "left-6" : "left-1")} />
        </span>
      </button>
      {!enfant.autorisation_photos ? (
        <p className="text-sm text-white/40">Les photos sont désactivées pour {enfant.prenom}.</p>
      ) : enfant.photos.length === 0 ? (
        <p className="text-sm text-white/40">Pas encore de photo.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {enfant.photos.map(p => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.legende || ""} className="h-full w-full object-cover" />
              {p.legende && <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[11px] text-white">{p.legende}</span>}
            </a>
          ))}
        </div>
      )}
      {groupe.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Photos de l&apos;académie</h3>
          <div className="flex flex-col gap-4">
            {groupe.map(a => (
              <div key={a.id}>
                <p className="text-sm font-semibold text-white">{a.titre}</p>
                <p className="text-[11px] text-white/30">{new Date(a.created_at).toLocaleDateString("fr-FR")}{a.categorie ? ` · ${a.categorie}` : ""}</p>
                <PhotosAnnonce photos={a.photos || []} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ======================= SUIVI SPORTIF =======================

function Barre({ label, note }: { label: string; note: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-white/50">{label}</span>
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4, 5].map(i => <span key={i} className={cn("h-2 flex-1 rounded-full", note && i <= note ? "bg-fiver-green" : "bg-white/10")} />)}
      </div>
      <span className="w-8 text-right text-xs font-bold text-white/70">{note ? `${note}/5` : "—"}</span>
    </div>
  );
}

function VueSuivi({ donnees, enfant, onRetour }: { donnees: DonneesParent; enfant: EnfantParent; onRetour: () => void }) {
  const aujourdhui = dateLocale();
  const debut = [decalerJours(aujourdhui, -60), enfant.created_at.slice(0, 10)].sort()[1];
  const seances = seancesEntre(donnees.planning, enfant.categorie_foot, debut, aujourdhui);
  const parDate = new Map(enfant.seances.map(s => [s.date, s]));
  const scans = new Set(enfant.scans);
  const presentes = seances.filter(d => parDate.get(d)?.presence === "present" || (scans.has(d) && parDate.get(d)?.presence !== "absent")).length;
  const taux = seances.length > 0 ? Math.round((presentes / seances.length) * 100) : null;

  return (
    <>
      <EnTete titre="Suivi sportif" onRetour={onRetour} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Assiduité · 2 derniers mois</p>
        <p className="mt-1 text-3xl font-bold text-fiver-green">{taux === null ? "—" : `${taux} %`}</p>
        <p className="text-xs text-white/40">{presentes} présence(s) sur {seances.length} séance(s)</p>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Évaluations des coachs</h3>
      {enfant.evaluations.length === 0 ? (
        <p className="text-sm text-white/40">Pas encore d&apos;évaluation.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {enfant.evaluations.map(e => (
            <div key={e.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs text-white/40">{new Date(e.date_eval + "T00:00:00").toLocaleDateString("fr-FR")}{e.auteur ? ` · ${e.auteur}` : ""}</p>
              <div className="flex flex-col gap-2">
                <Barre label="Discipline" note={e.discipline} />
                <Barre label="Comportement" note={e.comportement} />
                <Barre label="Progression" note={e.progression} />
              </div>
              {e.commentaire && <p className="mt-3 whitespace-pre-line text-sm text-white/75">{e.commentaire}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ======================= MESSAGES =======================

function VueMessages({ donnees, onRetour, onRecharger }: { donnees: DonneesParent; onRetour: () => void; onRecharger: () => Promise<void> }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const nonLus = donnees.messages.some(m => m.sens === "academie" && !m.lu);

  useEffect(() => {
    if (nonLus) appelParent("parent_messages_lus").then(onRecharger).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonLus]);
  useEffect(() => { fin.current?.scrollIntoView(); }, [donnees.messages.length]);

  async function envoyer() {
    if (!texte.trim()) return;
    setEnvoi(true);
    setErreur("");
    try {
      await appelParent("parent_envoyer_message", { p_contenu: texte.trim() });
      setTexte("");
      await onRecharger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    }
    setEnvoi(false);
  }

  return (
    <>
      <EnTete titre="Messages" onRetour={onRetour} />
      <div className="flex min-h-[40vh] flex-col gap-2">
        {donnees.messages.length === 0 && <p className="text-sm text-white/40">Écrivez à l&apos;académie, elle vous répondra ici.</p>}
        {donnees.messages.map(m => (
          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5", m.sens === "parent" ? "self-end bg-fiver-green text-fiver-black" : "self-start bg-white/[0.07] text-white")}>
            <p className="whitespace-pre-line text-sm">{m.contenu}</p>
            <p className={cn("mt-1 text-[10px]", m.sens === "parent" ? "text-fiver-black/60" : "text-white/40")}>
              {m.sens === "academie" ? "Académie · " : ""}{new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
        <div ref={fin} />
      </div>
      {erreur && <p className="mt-2 text-sm text-red-300">{erreur}</p>}
      <div className="sticky bottom-0 mt-4 flex items-end gap-2 bg-fiver-black pb-2 pt-2">
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Votre message…"
          className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none"
        />
        <button onClick={envoyer} disabled={envoi || !texte.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fiver-green text-fiver-black disabled:opacity-40" aria-label="Envoyer">
          {envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </>
  );
}

