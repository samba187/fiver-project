"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Check, X as XIcon, Send, Trash2, Upload, MessageCircle, Megaphone, Users, UserCog, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ACADEMY_CATEGORIES, fetchSaisonCourante, tel8 } from "@/lib/academy";
import { libelleDepot, lignesPreuve, imageEnDataUrl, MOYENS_SANS_CAPTURE, type LignePreuve } from "@/lib/parents";

interface Enfant { id: number; nom: string; prenom: string; categorie_foot: string | null; telephone_parent: string | null }
interface Preuve {
  id: number; registration_id: number; mois_concerne: string; montant: number; moyen_paiement: string | null; details: LignePreuve[] | null; note: string | null; depose_par: string | null;
  statut: "en_attente" | "valide" | "refuse"; motif_refus: string | null; traite_par: string | null; created_at: string;
}
interface Compte { id: string; telephone: string; nom: string | null; actif: boolean; created_at: string; derniere_connexion: string | null }
interface Message { id: number; parent_id: string; sens: "parent" | "academie"; contenu: string; auteur: string | null; lu: boolean; created_at: string }
interface Annonce { id: number; titre: string; contenu: string | null; categorie: string | null; auteur: string | null; photos?: string[] | null; created_at: string }
interface Coach { id: number; email: string; nom: string | null; role: string; created_at: string }

type Onglet = "paiements" | "messages" | "annonces" | "comptes" | "coachs";
const mru = (n: number) => `${n.toLocaleString("fr-FR")} MRU`;
const champ = "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none";

export default function EspaceParentsAdminPage() {
  const [onglet, setOnglet] = useState<Onglet>("paiements");
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [preuves, setPreuves] = useState<Preuve[]>([]);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [coachs, setCoachs] = useState<Coach[]>([]);
  const [moi, setMoi] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const saison = await fetchSaisonCourante();
    const [r, p, c, m, a, s] = await Promise.all([
      supabase.from("academy_registrations").select("id, nom, prenom, categorie_foot, telephone_parent").eq("saison", saison),
      supabase.from("academy_preuves_paiement").select("id, registration_id, mois_concerne, montant, moyen_paiement, details, note, depose_par, statut, motif_refus, traite_par, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("parent_comptes").select("*").order("created_at", { ascending: false }),
      supabase.from("parent_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("academy_annonces").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_comptes").select("*").order("created_at", { ascending: false }),
    ]);
    const err = [r, p, c, m, a, s].find(x => x.error)?.error;
    setErreur(err ? `Données indisponibles (${err.message}). La migration SQL de l'Espace Parents a-t-elle été exécutée ?` : "");
    setEnfants((r.data as Enfant[]) || []);
    setPreuves((p.data as Preuve[]) || []);
    setComptes((c.data as Compte[]) || []);
    setMessages((m.data as Message[]) || []);
    setAnnonces((a.data as Annonce[]) || []);
    setCoachs((s.data as Coach[]) || []);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
    supabase.auth.getUser().then(({ data }) => setMoi(data.user?.email?.split("@")[0] || "admin"));
  }, [charger]);

  // Nouveaux paiements et messages des parents sans recharger la page
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") charger(); }, 15000);
    return () => clearInterval(t);
  }, [charger]);

  const enAttente = preuves.filter(p => p.statut === "en_attente").length;
  const nonLus = messages.filter(m => m.sens === "parent" && !m.lu).length;

  const onglets: { id: Onglet; label: string; icon: typeof Upload; badge?: number }[] = [
    { id: "paiements", label: "Paiements", icon: Upload, badge: enAttente },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: nonLus },
    { id: "annonces", label: "Annonces / Photos", icon: Megaphone },
    { id: "comptes", label: "Comptes parents", icon: Users },
    { id: "coachs", label: "Coachs", icon: UserCog },
  ];

  if (chargement) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-fiver-green" /></div>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Espace Parents</h1>
      {erreur && <p className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erreur}</p>}

      <div className="flex flex-wrap gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
        {onglets.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} className={cn("flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium", onglet === o.id ? "bg-fiver-green text-fiver-black" : "text-white/50 hover:text-white/80")}>
            <o.icon className="h-4 w-4" /> {o.label}
            {!!o.badge && <span className={cn("rounded-full px-1.5 text-[11px] font-bold", onglet === o.id ? "bg-fiver-black/20" : "bg-fiver-green text-fiver-black")}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {onglet === "paiements" && <OngletPaiements preuves={preuves} enfants={enfants} moi={moi} onMaj={charger} />}
      {onglet === "messages" && <OngletMessages comptes={comptes} messages={messages} enfants={enfants} moi={moi} onMaj={charger} />}
      {onglet === "annonces" && <OngletAnnonces annonces={annonces} moi={moi} onMaj={charger} />}
      {onglet === "comptes" && <OngletComptes comptes={comptes} enfants={enfants} onMaj={charger} />}
      {onglet === "coachs" && <OngletCoachs coachs={coachs} onMaj={charger} />}
    </div>
  );
}

/** Un compte parent affiché par ses enfants : "Awa & Samba COULIBALY" (repli : nom du parent ou numéro). */
function nomFamille(c: Compte, enfants: Enfant[]) {
  const ses = enfants.filter(e => tel8(e.telephone_parent) === c.telephone);
  if (ses.length === 0) return c.nom || c.telephone;
  if (new Set(ses.map(e => e.nom.toUpperCase())).size === 1) return `${ses.map(e => e.prenom).join(" & ")} ${ses[0].nom.toUpperCase()}`;
  return ses.map(e => `${e.prenom} ${e.nom.toUpperCase()}`).join(", ");
}

const sousTitreParent = (c: Compte) => `Parent${c.nom ? ` ${c.nom}` : ""} · ${c.telephone}`;

/** Notification sur le téléphone du parent (refus, message) — sans bloquer si elle échoue */
async function notifierParent(corps: { type: "refus"; preuveId: number } | { type: "message"; parentId: string }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/parents/notifier", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify(corps),
    });
  } catch {}
}

function nomEnfant(enfants: Enfant[], id: number) {
  const e = enfants.find(x => x.id === id);
  return e ? `${e.prenom} ${e.nom}` : `Fiche n°${id}`;
}

// ======================= PAIEMENTS =======================

function OngletPaiements({ preuves, enfants, moi, onMaj }: { preuves: Preuve[]; enfants: Enfant[]; moi: string | null; onMaj: () => Promise<void> }) {
  const [ouverte, setOuverte] = useState<Preuve | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [filtre, setFiltre] = useState<"en_attente" | "traites">("en_attente");
  // Après validation : message WhatsApp envoyé automatiquement, ou prêt à envoyer en un clic
  const [confirmation, setConfirmation] = useState<{ enfant: string; envoye: boolean; lien: string | null; erreur?: boolean } | null>(null);

  async function prevenirParent(p: Preuve) {
    const enfant = nomEnfant(enfants, p.registration_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/whatsapp/paiement-valide", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ preuveId: p.id, origin: window.location.origin }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.erreur);
      setConfirmation({
        enfant, envoye: !!r.envoye,
        lien: r.telephone ? `https://wa.me/${r.telephone}?text=${encodeURIComponent(r.message)}` : null,
      });
    } catch {
      setConfirmation({ enfant, envoye: false, lien: null, erreur: true });
    }
  }

  async function ouvrir(p: Preuve) {
    setOuverte(p);
    setImage(null);
    setMotif("");
    const { data } = await supabase.from("academy_preuves_paiement").select("image").eq("id", p.id).maybeSingle();
    setImage((data as { image: string | null } | null)?.image || "");
  }

  async function valider(p: Preuve) {
    setEnCours(true);
    try {
      // Un dépôt peut couvrir plusieurs mois (et les frais) : une ligne de paiement par mois
      const lignes = lignesPreuve(p);
      if (lignes.some(l => l.mois === "FRAIS")) {
        const { error } = await supabase.from("academy_registrations").update({ frais_inscription_paye: true }).eq("id", p.registration_id);
        if (error) throw error;
      }
      const moisPayes = lignes.filter(l => l.mois !== "FRAIS").map(l => l.mois);
      if (moisPayes.length > 0) {
        // Un mois marqué OFF redevient un mois payé
        await supabase.from("academy_payments_history").delete().eq("registration_id", p.registration_id).in("mois_concerne", moisPayes).eq("moyen_paiement", "OFF");
      }
      const maintenant = new Date().toISOString();
      const { error: eH } = await supabase.from("academy_payments_history").insert(lignes.map(l => ({
        registration_id: p.registration_id, mois_concerne: l.mois, montant: l.montant,
        moyen_paiement: p.moyen_paiement || "Autre",
        description: l.mois === "FRAIS" ? "Frais d'inscription (dépôt parent)" : "Mensualité (dépôt parent)",
        date_paiement: maintenant,
      })));
      if (eH) throw eH;
      const { error: eP } = await supabase.from("academy_preuves_paiement").update({ statut: "valide", traite_par: moi, traite_le: new Date().toISOString() }).eq("id", p.id);
      if (eP) throw eP;
      setOuverte(null);
      await prevenirParent(p);
      await onMaj();
    } catch (e) {
      alert("Validation impossible : " + (e instanceof Error ? e.message : String(e)));
    }
    setEnCours(false);
  }

  async function refuser(p: Preuve) {
    if (!motif.trim()) { alert("Indiquez le motif du refus : il sera affiché au parent."); return; }
    setEnCours(true);
    const { error } = await supabase.from("academy_preuves_paiement").update({ statut: "refuse", motif_refus: motif.trim(), traite_par: moi, traite_le: new Date().toISOString() }).eq("id", p.id);
    if (error) alert(error.message);
    else { setOuverte(null); notifierParent({ type: "refus", preuveId: p.id }); await onMaj(); }
    setEnCours(false);
  }

  const liste = preuves.filter(p => filtre === "en_attente" ? p.statut === "en_attente" : p.statut !== "en_attente");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["en_attente", "traites"] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", filtre === f ? "bg-white/15 text-white" : "bg-white/5 text-white/40")}>
            {f === "en_attente" ? `À vérifier (${preuves.filter(p => p.statut === "en_attente").length})` : "Déjà traités"}
          </button>
        ))}
      </div>
      {liste.length === 0 && <p className="py-10 text-center text-sm text-white/30">{filtre === "en_attente" ? "Aucun paiement à vérifier." : "Aucun paiement traité."}</p>}
      {liste.map(p => (
        <button key={p.id} onClick={() => ouvrir(p)} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06]">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{nomEnfant(enfants, p.registration_id)} <span className="font-normal text-white/40">· {libelleDepot(p)}</span></p>
            <p className="text-xs text-white/40">{mru(p.montant)} · {p.moyen_paiement} · déposé le {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
            {p.depose_par && <p className="mt-0.5 text-xs font-semibold text-violet-300">Déposé par le staff : {p.depose_par}</p>}
            {p.note && <p className="mt-0.5 truncate text-xs text-sky-300/80">Note : {p.note}</p>}
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold",
            p.statut === "en_attente" ? "bg-amber-400/15 text-amber-300" : p.statut === "valide" ? "bg-fiver-green/15 text-fiver-green" : "bg-red-500/15 text-red-300")}>
            {p.statut === "en_attente" ? "À vérifier" : p.statut === "valide" ? `Validé${p.traite_par ? ` · ${p.traite_par}` : ""}` : "Refusé"}
          </span>
        </button>
      ))}

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setConfirmation(null)}>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111] p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fiver-green/15 text-fiver-green"><Check className="h-6 w-6" /></div>
            <p className="mt-3 text-lg font-bold text-white">Paiement validé</p>
            <p className="text-sm text-white/50">{confirmation.enfant}</p>
            {confirmation.envoye ? (
              <p className="mt-4 rounded-lg bg-fiver-green/10 px-3 py-2.5 text-sm text-fiver-green">Message WhatsApp de confirmation envoyé au parent.</p>
            ) : confirmation.lien ? (
              <a href={confirmation.lien} target="_blank" rel="noreferrer" onClick={() => setTimeout(() => setConfirmation(null), 300)}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3.5 text-sm font-black text-black">
                <MessageCircle className="h-5 w-5" /> Prévenir le parent sur WhatsApp
              </a>
            ) : (
              <p className="mt-4 text-sm text-white/40">{confirmation.erreur ? "Message WhatsApp indisponible pour le moment." : "Pas de numéro de téléphone pour ce parent."}</p>
            )}
            <button onClick={() => setConfirmation(null)} className="mt-3 w-full rounded-lg py-2.5 text-sm text-white/50 hover:text-white">Fermer</button>
          </div>
        </div>
      )}

      {ouverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setOuverte(null)}>
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111] p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-white">{nomEnfant(enfants, ouverte.registration_id)}</p>
                <p className="text-sm text-white/50">{libelleDepot(ouverte)} · {mru(ouverte.montant)} · {ouverte.moyen_paiement}</p>
                {lignesPreuve(ouverte).length > 1 && (
                  <p className="mt-1 text-xs text-white/40">{lignesPreuve(ouverte).map(l => `${libelleDepot({ ...ouverte, details: [l] })} : ${mru(l.montant)}`).join(" · ")}</p>
                )}
                <p className="text-xs text-white/30">Tél. {enfants.find(e => e.id === ouverte.registration_id)?.telephone_parent || "—"}</p>
                {ouverte.depose_par && <p className="mt-2 rounded-md border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-sm text-violet-100">Déposé par le staff : <strong>{ouverte.depose_par}</strong></p>}
                {ouverte.note && <p className="mt-2 rounded-md border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100">{ouverte.depose_par ? "Note" : "Note du parent"} : {ouverte.note}</p>}
              </div>
              <button onClick={() => setOuverte(null)} className="text-white/40 hover:text-white"><XIcon className="h-5 w-5" /></button>
            </div>
            {image === null ? (
              <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fiver-green" /></div>
            ) : image ? (
              <a href={image} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Capture du paiement" className="max-h-[55dvh] w-full rounded-lg bg-black object-contain" />
              </a>
            ) : (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
                {MOYENS_SANS_CAPTURE.includes(ouverte.moyen_paiement || "")
                  ? `Paiement déclaré en ${ouverte.moyen_paiement === "Cash" ? "espèces" : "« Autre »"}, sans capture : validez seulement si l'argent a bien été reçu.`
                  : "Pas de capture."}
              </p>
            )}

            {ouverte.statut === "en_attente" ? (
              <div className="mt-4 flex flex-col gap-3">
                <button onClick={() => valider(ouverte)} disabled={enCours} className="flex items-center justify-center gap-2 rounded-lg bg-fiver-green py-3 text-sm font-bold text-fiver-black disabled:opacity-50">
                  {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Valider — enregistrer le paiement
                </button>
                <div className="flex gap-2">
                  <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif du refus (visible par le parent)" className={champ} />
                  <button onClick={() => refuser(ouverte)} disabled={enCours} className="shrink-0 rounded-md border border-red-500/40 px-4 text-sm font-bold text-red-300 disabled:opacity-50">Refuser</button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/50">
                {ouverte.statut === "valide" ? "Validé" : `Refusé : ${ouverte.motif_refus || "—"}`}{ouverte.traite_par ? ` par ${ouverte.traite_par}` : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ======================= MESSAGES =======================

function OngletMessages({ comptes, messages, enfants, moi, onMaj }: { comptes: Compte[]; messages: Message[]; enfants: Enfant[]; moi: string | null; onMaj: () => Promise<void> }) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const fils = useMemo(() => {
    return comptes
      .map(c => {
        const msgs = messages.filter(m => m.parent_id === c.id);
        return { compte: c, dernier: msgs[msgs.length - 1], nonLus: msgs.filter(m => m.sens === "parent" && !m.lu).length };
      })
      .sort((a, b) => (b.dernier?.created_at || "").localeCompare(a.dernier?.created_at || ""));
  }, [comptes, messages]);

  const fil = parentId ? messages.filter(m => m.parent_id === parentId) : [];
  const compte = comptes.find(c => c.id === parentId);

  const ouvrir = (id: string) => setParentId(id);
  const finFil = useRef<HTMLDivElement>(null);

  // Conversation ouverte : les messages du parent (y compris ceux qui arrivent) sont marqués lus
  const nonLusFil = parentId ? messages.filter(m => m.parent_id === parentId && m.sens === "parent" && !m.lu).length : 0;
  useEffect(() => {
    if (!parentId || nonLusFil === 0) return;
    supabase.from("parent_messages").update({ lu: true }).eq("parent_id", parentId).eq("sens", "parent").eq("lu", false).then(() => onMaj());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, nonLusFil]);
  useEffect(() => { finFil.current?.scrollIntoView({ block: "nearest" }); }, [parentId, fil.length]);

  async function envoyer() {
    if (!parentId || !texte.trim()) return;
    setEnvoi(true);
    const { error } = await supabase.from("parent_messages").insert({ parent_id: parentId, sens: "academie", contenu: texte.trim(), auteur: moi });
    if (error) alert(error.message); else { setTexte(""); notifierParent({ type: "message", parentId }); await onMaj(); }
    setEnvoi(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className={cn("flex flex-col gap-1.5", parentId && "hidden lg:flex")}>
        {fils.length === 0 && <p className="py-10 text-center text-sm text-white/30">Aucun compte parent.</p>}
        {fils.map(f => (
          <button key={f.compte.id} onClick={() => ouvrir(f.compte.id)} className={cn("rounded-lg border px-3 py-2.5 text-left", parentId === f.compte.id ? "border-fiver-green/40 bg-fiver-green/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]")}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">{nomFamille(f.compte, enfants)}</p>
              {f.nonLus > 0 && <span className="rounded-full bg-fiver-green px-1.5 text-[11px] font-bold text-fiver-black">{f.nonLus}</span>}
            </div>
            <p className="truncate text-xs text-white/40">{sousTitreParent(f.compte)}</p>
            {f.dernier && <p className="mt-0.5 truncate text-xs text-white/30">{f.dernier.sens === "academie" ? "Vous : " : ""}{f.dernier.contenu}</p>}
          </button>
        ))}
      </div>

      {parentId && compte && (
        <div className="flex flex-col rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{nomFamille(compte, enfants)}</p>
              <p className="text-xs text-white/40">{sousTitreParent(compte)}</p>
            </div>
            <button onClick={() => setParentId(null)} className="text-white/40 hover:text-white lg:hidden"><XIcon className="h-5 w-5" /></button>
          </div>
          <div className="flex max-h-[55vh] min-h-[30vh] flex-col gap-2 overflow-y-auto">
            {fil.length === 0 && <p className="text-sm text-white/30">Aucun message. Écrivez le premier.</p>}
            {fil.map(m => (
              <div key={m.id} className={cn("max-w-[80%] rounded-xl px-3 py-2", m.sens === "academie" ? "self-end bg-fiver-green text-fiver-black" : "self-start bg-white/[0.07] text-white")}>
                <p className="whitespace-pre-line text-sm">{m.contenu}</p>
                <p className={cn("mt-0.5 text-[10px]", m.sens === "academie" ? "text-fiver-black/60" : "text-white/40")}>
                  {m.sens === "academie" && m.auteur ? `${m.auteur} · ` : ""}{new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
            <div ref={finFil} />
          </div>
          <div className="mt-3 flex gap-2">
            <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={2} placeholder="Votre réponse…" className={cn(champ, "resize-none")} />
            <button onClick={envoyer} disabled={envoi || !texte.trim()} className="flex w-12 shrink-0 items-center justify-center rounded-md bg-fiver-green text-fiver-black disabled:opacity-40">
              {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================= ANNONCES =======================

const MAX_PHOTOS_ANNONCE = 6;

function OngletAnnonces({ annonces, moi, onMaj }: { annonces: Annonce[]; moi: string | null; onMaj: () => Promise<void> }) {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [categorie, setCategorie] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [preparation, setPreparation] = useState(false);
  const inputPhotos = useRef<HTMLInputElement>(null);

  // Photos choisies dans la galerie (ou prises avec l'appareil), compressées avant l'envoi
  async function choisirPhotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(ev.target.files || []).slice(0, MAX_PHOTOS_ANNONCE - photos.length);
    ev.target.value = "";
    if (fichiers.length === 0) return;
    setPreparation(true);
    try {
      const prets = await Promise.all(fichiers.map(f => imageEnDataUrl(f, 1400)));
      setPhotos(p => [...p, ...prets].slice(0, MAX_PHOTOS_ANNONCE));
    } catch {
      alert("Une des photos n'a pas pu être lue.");
    }
    setPreparation(false);
  }

  async function publier() {
    if (!titre.trim() && photos.length === 0) return;
    setEnvoi(true);
    try {
      // Chaque photo est stockée dans la base et servie par /api/image/<id>
      const urls: string[] = [];
      for (const data of photos) {
        const { data: img, error } = await supabase.from("academy_images").insert({ data }).select("id").single();
        if (error) throw error;
        urls.push(`/api/image/${(img as { id: string }).id}`);
      }
      const { error } = await supabase.from("academy_annonces").insert({
        titre: titre.trim() || (urls.length > 1 ? "Nouvelles photos" : "Nouvelle photo"),
        contenu: contenu.trim() || null, categorie: categorie || null, auteur: moi, photos: urls,
      });
      if (error) throw error;
      setTitre(""); setContenu(""); setCategorie(""); setPhotos([]);
      await onMaj();
    } catch (e) {
      alert("Publication impossible : " + (e instanceof Error ? e.message : (e as { message?: string })?.message || String(e)));
    }
    setEnvoi(false);
  }

  async function supprimer(a: Annonce) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("academy_annonces").delete().eq("id", a.id);
    const ids = (a.photos || []).map(u => u.split("/api/image/")[1]).filter(Boolean);
    if (ids.length) await supabase.from("academy_images").delete().in("id", ids);
    await onMaj();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre (ex : Pas d'entraînement vendredi, Photos du match…)" className={champ} />
        <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={3} placeholder="Détails (facultatif)" className={cn(champ, "resize-none")} />

        <input ref={inputPhotos} type="file" accept="image/*" multiple className="hidden" onChange={choisirPhotos} />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="Retirer la photo">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS_ANNONCE && (
          <button onClick={() => inputPhotos.current?.click()} disabled={preparation}
            className="flex items-center justify-center gap-2 rounded-md border border-dashed border-white/15 py-3 text-sm text-white/60 hover:bg-white/[0.03]">
            {preparation ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {photos.length ? "Ajouter d'autres photos" : "Ajouter des photos (galerie ou appareil photo)"}
          </button>
        )}

        <div className="flex gap-2">
          <select value={categorie} onChange={e => setCategorie(e.target.value)} className={cn(champ, "bg-[#1a1a1a]")}>
            <option value="">Tous les parents</option>
            {ACADEMY_CATEGORIES.map(c => <option key={c} value={c}>Parents {c}</option>)}
          </select>
          <button onClick={publier} disabled={envoi || preparation || (!titre.trim() && photos.length === 0)} className="flex shrink-0 items-center gap-2 rounded-md bg-fiver-green px-5 text-sm font-bold text-fiver-black disabled:opacity-40">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Publier
          </button>
        </div>
      </div>
      {annonces.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{a.titre}</p>
            {a.contenu && <p className="mt-1 whitespace-pre-line text-sm text-white/60">{a.contenu}</p>}
            {!!a.photos?.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.photos.map(u => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-16 w-16 rounded-md object-cover" /></a>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-white/30">{new Date(a.created_at).toLocaleDateString("fr-FR")} · {a.categorie ? `Parents ${a.categorie}` : "Tous les parents"}{a.auteur ? ` · ${a.auteur}` : ""}</p>
          </div>
          <button onClick={() => supprimer(a)} className="p-1 text-red-400/50 hover:text-red-400" aria-label="Supprimer l'annonce"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ======================= COMPTES PARENTS =======================

function OngletComptes({ comptes, enfants, onMaj }: { comptes: Compte[]; enfants: Enfant[]; onMaj: () => Promise<void> }) {
  const [recherche, setRecherche] = useState("");
  const familles = useMemo(() => new Set(enfants.map(e => tel8(e.telephone_parent)).filter(t => t.length === 8)), [enfants]);
  const sansCompte = [...familles].filter(t => !comptes.some(c => c.telephone === t)).length;
  const q = recherche.trim().toLowerCase();
  const liste = comptes.filter(c => {
    if (!q) return true;
    const noms = enfants.filter(e => tel8(e.telephone_parent) === c.telephone).map(e => `${e.prenom} ${e.nom}`).join(" ");
    return `${c.telephone} ${c.nom || ""} ${noms}`.toLowerCase().includes(q);
  });

  async function basculer(c: Compte) {
    await supabase.from("parent_comptes").update({ actif: !c.actif }).eq("id", c.id);
    await onMaj();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/50">
        <strong className="text-white">{comptes.length}</strong> compte(s) parent · <strong className="text-amber-300">{sansCompte}</strong> famille(s) inscrite(s) sans compte.
        Les parents se connectent avec le numéro donné à l&apos;inscription et le prénom de leur enfant (compte créé automatiquement).
      </p>
      <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un parent, un enfant, un numéro…" className={champ} />
      {liste.map(c => {
        const ses = enfants.filter(e => tel8(e.telephone_parent) === c.telephone);
        return (
          <div key={c.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3", !c.actif && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{nomFamille(c, enfants)} <span className="font-mono font-normal text-white/50">{c.telephone}</span></p>
              <p className="text-xs text-white/40">
                {ses.length ? ses.map(e => `${e.prenom} (${e.categorie_foot || "—"})`).join(", ") : "Aucun enfant cette saison"}
                {" · "}{c.derniere_connexion ? `vu le ${new Date(c.derniere_connexion).toLocaleDateString("fr-FR")}` : "jamais connecté"}
              </p>
            </div>
            <button onClick={() => basculer(c)} className={cn("rounded-md px-3 py-2 text-xs font-semibold", c.actif ? "bg-red-500/10 text-red-300" : "bg-fiver-green/10 text-fiver-green")}>
              {c.actif ? "Désactiver" : "Réactiver"}
            </button>
          </div>
        );
      })}
      {liste.length === 0 && <p className="py-8 text-center text-sm text-white/30">Aucun compte.</p>}
    </div>
  );
}

// ======================= COACHS =======================

function OngletCoachs({ coachs, onMaj }: { coachs: Coach[]; onMaj: () => Promise<void> }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function creer() {
    setMessage(null);
    const mail = email.trim().toLowerCase();
    if (!mail || mdp.length < 6) { setMessage({ ok: false, texte: "Email et mot de passe (6 caractères minimum) obligatoires." }); return; }
    if (mail.includes("admin")) { setMessage({ ok: false, texte: "Un email contenant « admin » ouvrirait l'espace admin. Choisissez un autre email pour un coach." }); return; }
    setEnvoi(true);
    // Client isolé : créer le compte ne doit pas déconnecter l'admin
    const isole = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "fiveur-creation-coach" },
    });
    const { data, error } = await isole.auth.signUp({ email: mail, password: mdp });
    if (error) {
      setMessage({ ok: false, texte: error.message.includes("registered") ? "Cet email a déjà un compte." : error.message });
    } else {
      await supabase.from("staff_comptes").insert({ email: mail, nom: nom.trim() || null, role: "coach" });
      setMessage({
        ok: true,
        texte: data.session
          ? `Compte créé. Le coach se connecte sur /staff avec ${mail} et le mot de passe choisi.`
          : `Compte créé. Un email de confirmation a été envoyé à ${mail} : le coach doit cliquer le lien avant de se connecter.`,
      });
      setNom(""); setEmail(""); setMdp("");
      await onMaj();
    }
    setEnvoi(false);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <p className="text-sm font-semibold text-white">Nouveau compte coach</p>
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du coach" className={champ} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className={champ} />
        <input value={mdp} onChange={e => setMdp(e.target.value)} type="text" placeholder="Mot de passe (6 caractères min.)" className={champ} />
        {message && <p className={cn("text-sm", message.ok ? "text-fiver-green" : "text-red-300")}>{message.texte}</p>}
        <button onClick={creer} disabled={envoi} className="flex items-center justify-center gap-2 rounded-md bg-fiver-green py-2.5 text-sm font-bold text-fiver-black disabled:opacity-50">
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Créer le compte
        </button>
      </div>
      {coachs.map(c => (
        <div key={c.id} className="rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-sm font-semibold text-white">{c.nom || c.email}</p>
          <p className="text-xs text-white/40">{c.email} · créé le {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
        </div>
      ))}
    </div>
  );
}
