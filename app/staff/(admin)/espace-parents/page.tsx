"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Check, X as XIcon, Send, Trash2, KeyRound, Upload, MessageCircle, Megaphone, Users, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ACADEMY_CATEGORIES, fetchSaisonCourante, tel8 } from "@/lib/academy";
import { libelleMois } from "@/lib/parents";

interface Enfant { id: number; nom: string; prenom: string; categorie_foot: string | null; telephone_parent: string | null }
interface Preuve {
  id: number; registration_id: number; mois_concerne: string; montant: number; moyen_paiement: string | null;
  statut: "en_attente" | "valide" | "refuse"; motif_refus: string | null; traite_par: string | null; created_at: string;
}
interface Compte { id: string; telephone: string; nom: string | null; actif: boolean; created_at: string; derniere_connexion: string | null }
interface Message { id: number; parent_id: string; sens: "parent" | "academie"; contenu: string; auteur: string | null; lu: boolean; created_at: string }
interface Annonce { id: number; titre: string; contenu: string | null; categorie: string | null; auteur: string | null; created_at: string }
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
      supabase.from("academy_preuves_paiement").select("id, registration_id, mois_concerne, montant, moyen_paiement, statut, motif_refus, traite_par, created_at").order("created_at", { ascending: false }).limit(200),
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

  const enAttente = preuves.filter(p => p.statut === "en_attente").length;
  const nonLus = messages.filter(m => m.sens === "parent" && !m.lu).length;

  const onglets: { id: Onglet; label: string; icon: typeof Upload; badge?: number }[] = [
    { id: "paiements", label: "Paiements", icon: Upload, badge: enAttente },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: nonLus },
    { id: "annonces", label: "Annonces", icon: Megaphone },
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
      if (p.mois_concerne === "FRAIS") {
        const { error } = await supabase.from("academy_registrations").update({ frais_inscription_paye: true }).eq("id", p.registration_id);
        if (error) throw error;
      } else {
        // Un mois marqué OFF redevient un mois payé
        await supabase.from("academy_payments_history").delete().eq("registration_id", p.registration_id).eq("mois_concerne", p.mois_concerne).eq("moyen_paiement", "OFF");
      }
      const { error: eH } = await supabase.from("academy_payments_history").insert({
        registration_id: p.registration_id, mois_concerne: p.mois_concerne, montant: p.montant,
        moyen_paiement: p.moyen_paiement || "Autre",
        description: p.mois_concerne === "FRAIS" ? "Frais d'inscription (dépôt parent)" : "Mensualité (dépôt parent)",
        date_paiement: new Date().toISOString(),
      });
      if (eH) throw eH;
      const { error: eP } = await supabase.from("academy_preuves_paiement").update({ statut: "valide", traite_par: moi, traite_le: new Date().toISOString() }).eq("id", p.id);
      if (eP) throw eP;
      setOuverte(null);
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
    else { setOuverte(null); await onMaj(); }
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
            <p className="text-sm font-semibold text-white">{nomEnfant(enfants, p.registration_id)} <span className="font-normal text-white/40">· {libelleMois(p.mois_concerne)}</span></p>
            <p className="text-xs text-white/40">{mru(p.montant)} · {p.moyen_paiement} · déposé le {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold",
            p.statut === "en_attente" ? "bg-amber-400/15 text-amber-300" : p.statut === "valide" ? "bg-fiver-green/15 text-fiver-green" : "bg-red-500/15 text-red-300")}>
            {p.statut === "en_attente" ? "À vérifier" : p.statut === "valide" ? `Validé${p.traite_par ? ` · ${p.traite_par}` : ""}` : "Refusé"}
          </span>
        </button>
      ))}

      {ouverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setOuverte(null)}>
          <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111] p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-white">{nomEnfant(enfants, ouverte.registration_id)}</p>
                <p className="text-sm text-white/50">{libelleMois(ouverte.mois_concerne)} · {mru(ouverte.montant)} · {ouverte.moyen_paiement}</p>
                <p className="text-xs text-white/30">Tél. {enfants.find(e => e.id === ouverte.registration_id)?.telephone_parent || "—"}</p>
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
            ) : <p className="text-sm text-white/40">Pas de capture.</p>}

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

  const enfantsDe = (c: Compte) => enfants.filter(e => tel8(e.telephone_parent) === c.telephone).map(e => e.prenom).join(", ");
  const fil = parentId ? messages.filter(m => m.parent_id === parentId) : [];
  const compte = comptes.find(c => c.id === parentId);

  async function ouvrir(id: string) {
    setParentId(id);
    if (messages.some(m => m.parent_id === id && m.sens === "parent" && !m.lu)) {
      await supabase.from("parent_messages").update({ lu: true }).eq("parent_id", id).eq("sens", "parent").eq("lu", false);
      await onMaj();
    }
  }

  async function envoyer() {
    if (!parentId || !texte.trim()) return;
    setEnvoi(true);
    const { error } = await supabase.from("parent_messages").insert({ parent_id: parentId, sens: "academie", contenu: texte.trim(), auteur: moi });
    if (error) alert(error.message); else { setTexte(""); await onMaj(); }
    setEnvoi(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className={cn("flex flex-col gap-1.5", parentId && "hidden lg:flex")}>
        {fils.length === 0 && <p className="py-10 text-center text-sm text-white/30">Aucun compte parent.</p>}
        {fils.map(f => (
          <button key={f.compte.id} onClick={() => ouvrir(f.compte.id)} className={cn("rounded-lg border px-3 py-2.5 text-left", parentId === f.compte.id ? "border-fiver-green/40 bg-fiver-green/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]")}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">{f.compte.nom || f.compte.telephone}</p>
              {f.nonLus > 0 && <span className="rounded-full bg-fiver-green px-1.5 text-[11px] font-bold text-fiver-black">{f.nonLus}</span>}
            </div>
            <p className="truncate text-xs text-white/40">{enfantsDe(f.compte) || f.compte.telephone}</p>
            {f.dernier && <p className="mt-0.5 truncate text-xs text-white/30">{f.dernier.sens === "academie" ? "Vous : " : ""}{f.dernier.contenu}</p>}
          </button>
        ))}
      </div>

      {parentId && compte && (
        <div className="flex flex-col rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{compte.nom || compte.telephone}</p>
              <p className="text-xs text-white/40">{compte.telephone} · {enfantsDe(compte)}</p>
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

function OngletAnnonces({ annonces, moi, onMaj }: { annonces: Annonce[]; moi: string | null; onMaj: () => Promise<void> }) {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [categorie, setCategorie] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function publier() {
    if (!titre.trim()) return;
    setEnvoi(true);
    const { error } = await supabase.from("academy_annonces").insert({ titre: titre.trim(), contenu: contenu.trim() || null, categorie: categorie || null, auteur: moi });
    if (error) alert(error.message); else { setTitre(""); setContenu(""); setCategorie(""); await onMaj(); }
    setEnvoi(false);
  }

  async function supprimer(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("academy_annonces").delete().eq("id", id);
    await onMaj();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre (ex : Pas d'entraînement vendredi)" className={champ} />
        <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={3} placeholder="Détails (facultatif)" className={cn(champ, "resize-none")} />
        <div className="flex gap-2">
          <select value={categorie} onChange={e => setCategorie(e.target.value)} className={cn(champ, "bg-[#1a1a1a]")}>
            <option value="">Tous les parents</option>
            {ACADEMY_CATEGORIES.map(c => <option key={c} value={c}>Parents {c}</option>)}
          </select>
          <button onClick={publier} disabled={envoi || !titre.trim()} className="flex shrink-0 items-center gap-2 rounded-md bg-fiver-green px-5 text-sm font-bold text-fiver-black disabled:opacity-40">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Publier
          </button>
        </div>
      </div>
      {annonces.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{a.titre}</p>
            {a.contenu && <p className="mt-1 whitespace-pre-line text-sm text-white/60">{a.contenu}</p>}
            <p className="mt-1 text-xs text-white/30">{new Date(a.created_at).toLocaleDateString("fr-FR")} · {a.categorie ? `Parents ${a.categorie}` : "Tous les parents"}{a.auteur ? ` · ${a.auteur}` : ""}</p>
          </div>
          <button onClick={() => supprimer(a.id)} className="p-1 text-red-400/50 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
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

  async function nouveauMotDePasse(c: Compte) {
    const mdp = prompt(`Nouveau mot de passe pour ${c.nom || c.telephone} (6 caractères minimum) :`);
    if (!mdp) return;
    const { error } = await supabase.rpc("admin_parent_mot_de_passe", { p_parent_id: c.id, p_mot_de_passe: mdp });
    if (error) alert(error.message.includes("COURT") ? "Mot de passe trop court." : error.message);
    else alert(`Mot de passe changé. Communiquez-le au parent : ${mdp}`);
  }

  async function basculer(c: Compte) {
    await supabase.from("parent_comptes").update({ actif: !c.actif }).eq("id", c.id);
    await onMaj();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/50">
        <strong className="text-white">{comptes.length}</strong> compte(s) parent · <strong className="text-amber-300">{sansCompte}</strong> famille(s) inscrite(s) sans compte.
        Les parents créent leur compte eux-mêmes avec leur numéro et le code joueur de la carte.
      </p>
      <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un parent, un enfant, un numéro…" className={champ} />
      {liste.map(c => {
        const ses = enfants.filter(e => tel8(e.telephone_parent) === c.telephone);
        return (
          <div key={c.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3", !c.actif && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{c.nom || "Parent"} <span className="font-mono font-normal text-white/50">{c.telephone}</span></p>
              <p className="text-xs text-white/40">
                {ses.length ? ses.map(e => `${e.prenom} (${e.categorie_foot || "—"})`).join(", ") : "Aucun enfant cette saison"}
                {" · "}{c.derniere_connexion ? `vu le ${new Date(c.derniere_connexion).toLocaleDateString("fr-FR")}` : "jamais connecté"}
              </p>
            </div>
            <button onClick={() => nouveauMotDePasse(c)} className="flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"><KeyRound className="h-3.5 w-3.5" /> Mot de passe</button>
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
