"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut, Camera, Upload, FileText, CalendarDays, Images, ClipboardCheck, MessageCircle, Bell,
  ChevronLeft, Loader2, Check, X as XIcon, Clock, Download, Send, CircleCheck, CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  appelParent, statutMoisEnfant, fraisEnVerification, libelleMois, telechargerRecu, imageEnDataUrl, LIBELLE_STATUT,
  MOYENS_PAIEMENT_PARENT, type DonneesParent, type EnfantParent, type StatutMois,
} from "@/lib/parents";
import {
  currentMonthStr, moisDeSaison, seancesEntre, dateLocale, decalerJours, JOURS_LONGS,
} from "@/lib/academy";

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

  useEffect(() => { window.scrollTo(0, 0); }, [vue]);

  const retour = () => setVue("accueil");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-5">
      {vue === "accueil" && (
        <Accueil donnees={donnees} enfant={enfant} setEnfantId={setEnfantId} setVue={setVue} nonLus={nonLus} onRecharger={onRecharger} onDeconnexion={onDeconnexion} />
      )}
      {vue === "paiement" && enfant && <VuePaiement donnees={donnees} enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "factures" && enfant && <VueFactures enfant={enfant} onRetour={retour} />}
      {vue === "entrainements" && enfant && <VueEntrainements donnees={donnees} enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "photos" && enfant && <VuePhotos enfant={enfant} onRetour={retour} onRecharger={onRecharger} />}
      {vue === "suivi" && enfant && <VueSuivi donnees={donnees} enfant={enfant} onRetour={retour} />}
      {vue === "messages" && <VueMessages donnees={donnees} onRetour={retour} onRecharger={onRecharger} />}
    </div>
  );
}

// ======================= ACCUEIL =======================

function Accueil({ donnees, enfant, setEnfantId, setVue, nonLus, onRecharger, onDeconnexion }: {
  donnees: DonneesParent; enfant: EnfantParent | null; setEnfantId: (id: number) => void; setVue: (v: Vue) => void;
  nonLus: number; onRecharger: () => Promise<void>; onDeconnexion: () => void;
}) {
  const inputPhoto = useRef<HTMLInputElement>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
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

  const enAttente = enfant ? enfant.preuves.filter(p => p.statut === "en_attente").length : 0;
  const services: { vue: Vue; label: string; icon: typeof Upload; badge?: number }[] = [
    { vue: "paiement", label: "Déposer un paiement", icon: Upload, badge: enAttente },
    { vue: "factures", label: "Mes factures", icon: FileText },
    { vue: "entrainements", label: "Entraînements", icon: CalendarDays },
    { vue: "photos", label: "Mes photos", icon: Images },
    { vue: "suivi", label: "Suivi sportif", icon: ClipboardCheck },
    { vue: "messages", label: "Messages", icon: MessageCircle, badge: nonLus },
  ];

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fiver-green">Fiveur Academy</p>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-white">Espace Parents</h1>
        </div>
        <button onClick={onDeconnexion} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60" aria-label="Se déconnecter">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

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
              <span className="rounded-full bg-fiver-green/15 px-3 py-1 text-xs font-bold text-fiver-green">Inscrit</span>
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
                <p className="text-sm font-semibold text-white">{a.titre}</p>
                {a.contenu && <p className="mt-0.5 whitespace-pre-line text-sm text-white/60">{a.contenu}</p>}
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
  const options = useMemo(() => {
    const opts: { val: string; label: string; reste: number }[] = [];
    if (!enfant.frais_inscription_paye && !fraisEnVerification(enfant)) opts.push({ val: "FRAIS", label: "Frais d'inscription", reste: enfant.frais_inscription });
    const limite = moisSuivant(moisActuel);
    for (const m of moisDeSaison(enfant.saison)) {
      if (m > limite) break;
      const s = statutMoisEnfant(enfant, m, donnees.tarifs);
      if (["a_payer", "retard", "partiel", "a_venir"].includes(s.statut)) {
        opts.push({ val: m, label: libelleMois(m), reste: Math.max(0, s.du - s.paye) });
      }
    }
    return opts;
  }, [enfant, donnees.tarifs, moisActuel]);

  const [mois, setMois] = useState(options.find(o => o.val === moisActuel)?.val || options[0]?.val || "");
  const [montant, setMontant] = useState(String(options.find(o => o.val === mois)?.reste || ""));
  const [moyen, setMoyen] = useState("Bankily");
  const [image, setImage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const inputImage = useRef<HTMLInputElement>(null);

  function choisirMois(m: string) {
    setMois(m);
    setMontant(String(options.find(o => o.val === m)?.reste || ""));
  }

  async function choisirImage(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    try { setImage(await imageEnDataUrl(file, 1200)); } catch { setMessage({ ok: false, texte: "Image illisible." }); }
  }

  async function envoyer() {
    setMessage(null);
    if (!mois || !image || !(parseInt(montant) > 0)) {
      setMessage({ ok: false, texte: "Choisissez le mois, le montant et ajoutez la capture d'écran." });
      return;
    }
    setEnvoi(true);
    try {
      await appelParent("parent_deposer_paiement", {
        p_registration_id: enfant.id, p_mois: mois, p_montant: parseInt(montant), p_moyen: moyen, p_image: image,
      });
      setImage("");
      setMessage({ ok: true, texte: "Paiement envoyé. L'académie va le vérifier." });
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
        <div className="rounded-2xl border border-fiver-green/20 bg-fiver-green/5 p-4 text-sm text-fiver-green">Tout est réglé pour le moment.</div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Pour</p>
            <select value={mois} onChange={e => choisirMois(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-3 text-base text-white">
              {options.map(o => <option key={o.val} value={o.val}>{o.label}{o.reste ? ` — ${mru(o.reste)}` : ""}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Montant payé (MRU)</p>
            <input type="number" inputMode="numeric" value={montant} onChange={e => setMontant(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-base font-bold text-white" />
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
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Capture d&apos;écran du paiement</p>
            <input ref={inputImage} type="file" accept="image/*" className="hidden" onChange={choisirImage} />
            {image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Capture" className="max-h-72 w-full rounded-lg object-contain bg-black" />
                <button onClick={() => setImage("")} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"><XIcon className="h-4 w-4" /></button>
              </div>
            ) : (
              <button onClick={() => inputImage.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/15 py-8 text-sm text-white/50">
                <Camera className="h-6 w-6" /> Ajouter la capture
              </button>
            )}
          </div>
          {message && <p className={cn("text-sm", message.ok ? "text-fiver-green" : "text-red-300")}>{message.texte}</p>}
          <button onClick={envoyer} disabled={envoi} className="flex items-center justify-center gap-2 rounded-lg bg-fiver-green py-3.5 text-sm font-bold uppercase tracking-wide text-fiver-black disabled:opacity-50">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Envoyer
          </button>
        </div>
      )}
      {message?.ok && options.length === 0 && <p className="mt-3 text-sm text-fiver-green">{message.texte}</p>}

      {enfant.preuves.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-white/60">Mes dépôts</h3>
          <div className="flex flex-col gap-2">
            {enfant.preuves.map(p => (
              <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{libelleMois(p.mois_concerne)}</p>
                    <p className="text-xs text-white/40">{mru(p.montant)} · {p.moyen_paiement} · {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUT_PREUVE[p.statut].cls)}>{STATUT_PREUVE[p.statut].label}</span>
                </div>
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

function VueFactures({ enfant, onRetour }: { enfant: EnfantParent; onRetour: () => void }) {
  const paiements = enfant.academy_payments_history.filter(p => p.moyen_paiement !== "OFF" && p.montant > 0);
  const [enCours, setEnCours] = useState<number | null>(null);
  return (
    <>
      <EnTete titre="Mes factures" onRetour={onRetour} />
      <p className="mb-4 text-sm text-white/50">{enfant.prenom} {enfant.nom} · saison {enfant.saison}</p>
      {paiements.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">Aucun paiement enregistré pour cette saison.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {paiements.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{libelleMois(p.mois_concerne)}</p>
                <p className="text-xs text-white/40">{mru(p.montant)} · {p.moyen_paiement || "—"} · {new Date(p.date_paiement).toLocaleDateString("fr-FR")}</p>
              </div>
              <button
                onClick={async () => { setEnCours(p.id); try { await telechargerRecu(enfant, p); } finally { setEnCours(null); } }}
                className="flex items-center gap-1.5 rounded-lg bg-fiver-green/10 px-3 py-2 text-xs font-bold text-fiver-green"
              >
                {enCours === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Reçu
              </button>
            </div>
          ))}
        </div>
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

function VuePhotos({ enfant, onRetour, onRecharger }: { enfant: EnfantParent; onRetour: () => void; onRecharger: () => Promise<void> }) {
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
  }, []);
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

