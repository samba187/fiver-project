"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X as XIcon, Camera, Phone, Trash2, Eye, EyeOff, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import {
  ACADEMY_CATEGORIES, fetchPlanning, fetchSaisonCourante, seancesEntre, dateLocale, decalerJours, type PlanningAcademy,
} from "@/lib/academy";

interface Joueur {
  id: number; nom: string; prenom: string; categorie_foot: string | null; photo_url: string | null; date_naissance: string | null;
  telephone_parent: string | null; autorisation_sortie: boolean | null; autorisation_photos: boolean | null; created_at: string;
}
interface Evaluation { id: number; date_eval: string; discipline: number | null; comportement: number | null; progression: number | null; commentaire: string | null; auteur: string | null; visible: boolean }
interface Photo { id: number; url: string; legende: string | null; auteur: string | null; visible: boolean; created_at: string }

function Avatar({ j, taille = "h-10 w-10" }: { j: Joueur; taille?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-full bg-white/5", taille)}>
      {j.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={j.photo_url} alt="" className="h-full w-full object-cover" />
      ) : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/30">{j.prenom[0]}{j.nom[0]}</div>}
    </div>
  );
}

function age(dob: string | null) {
  return dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null;
}

export function JoueursView({ admin = false }: { admin?: boolean }) {
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [planning, setPlanning] = useState<PlanningAcademy | null>(null);
  const [categorie, setCategorie] = useState("toutes");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState<Joueur | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const [saison, plan] = await Promise.all([fetchSaisonCourante(), fetchPlanning()]);
      const { data } = await supabase
        .from("academy_registrations")
        .select("id, nom, prenom, categorie_foot, photo_url, date_naissance, telephone_parent, autorisation_sortie, autorisation_photos, created_at")
        .eq("saison", saison)
        .order("prenom");
      setJoueurs((data as Joueur[]) || []);
      setPlanning(plan);
      setChargement(false);
    })();
  }, []);

  const categories = useMemo(() => ACADEMY_CATEGORIES.filter(c => joueurs.some(j => j.categorie_foot === c)), [joueurs]);
  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return joueurs.filter(j =>
      (categorie === "toutes" || j.categorie_foot === categorie) &&
      (!q || `${j.prenom} ${j.nom}`.toLowerCase().includes(q))
    );
  }, [joueurs, categorie, recherche]);

  if (chargement) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-fiver-green" /></div>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white">Joueurs</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {["toutes", ...categories].map(c => (
          <button key={c} onClick={() => setCategorie(c)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", categorie === c ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/60")}>
            {c === "toutes" ? "Toutes" : c} <span className="opacity-60">{c === "toutes" ? joueurs.length : joueurs.filter(j => j.categorie_foot === c).length}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un joueur…" className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
      </div>

      <div className="flex flex-col gap-1.5">
        {liste.map(j => (
          <button key={j.id} onClick={() => setOuvert(j)} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]">
            <Avatar j={j} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{j.prenom} {j.nom}</p>
              <p className="text-xs text-white/40">{j.categorie_foot || "—"}{age(j.date_naissance) !== null ? ` · ${age(j.date_naissance)} ans` : ""}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/20" />
          </button>
        ))}
        {liste.length === 0 && <p className="py-8 text-center text-sm text-white/30">Aucun joueur.</p>}
      </div>

      {ouvert && planning && <FicheJoueur joueur={ouvert} planning={planning} admin={admin} onFermer={() => setOuvert(null)} />}
    </div>
  );
}

// ======================= FICHE JOUEUR =======================

function Notes({ valeur, onChange }: { valeur: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className={cn("h-9 w-9 rounded-lg text-sm font-bold", n <= valeur ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40")}>{n}</button>
      ))}
    </div>
  );
}

function FicheJoueur({ joueur, planning, admin, onFermer }: { joueur: Joueur; planning: PlanningAcademy; admin: boolean; onFermer: () => void }) {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [assiduite, setAssiduite] = useState<{ presentes: number; total: number } | null>(null);
  const [auteur, setAuteur] = useState<string | null>(null);
  const [form, setForm] = useState({ discipline: 0, comportement: 0, progression: 0, commentaire: "", visible: true });
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState("");
  const inputPhoto = useRef<HTMLInputElement>(null);
  const photosAutorisees = joueur.autorisation_photos !== false;

  const charger = useCallback(async () => {
    const aujourdhui = dateLocale();
    const debut = [decalerJours(aujourdhui, -60), joueur.created_at.slice(0, 10)].sort()[1];
    const seances = seancesEntre(planning, joueur.categorie_foot, debut, aujourdhui);
    const [{ data: e }, { data: p }, { data: sp }, { data: sc }] = await Promise.all([
      supabase.from("academy_evaluations").select("*").eq("registration_id", joueur.id).order("date_eval", { ascending: false }),
      supabase.from("academy_galerie").select("*").eq("registration_id", joueur.id).order("created_at", { ascending: false }),
      supabase.from("academy_seance_presences").select("date_seance, presence_reelle").eq("registration_id", joueur.id).gte("date_seance", debut),
      supabase.from("academy_presences").select("date_presence").eq("registration_id", joueur.id).eq("autorise", true).gte("date_presence", debut),
    ]);
    setEvals((e as Evaluation[]) || []);
    setPhotos((p as Photo[]) || []);
    const reel = new Map(((sp as { date_seance: string; presence_reelle: string | null }[]) || []).map(x => [x.date_seance, x.presence_reelle]));
    const scans = new Set(((sc as { date_presence: string }[]) || []).map(x => x.date_presence));
    setAssiduite({
      total: seances.length,
      presentes: seances.filter(d => reel.get(d) === "present" || (scans.has(d) && reel.get(d) !== "absent")).length,
    });
  }, [joueur, planning]);

  useEffect(() => {
    charger();
    supabase.auth.getUser().then(({ data }) => setAuteur(data.user?.email?.split("@")[0] || null));
  }, [charger]);

  async function ajouterEvaluation() {
    if (!form.discipline && !form.comportement && !form.progression && !form.commentaire.trim()) { setErreur("Ajoutez au moins une note ou un commentaire."); return; }
    setEnvoi(true);
    setErreur("");
    const { error } = await supabase.from("academy_evaluations").insert({
      registration_id: joueur.id,
      discipline: form.discipline || null, comportement: form.comportement || null, progression: form.progression || null,
      commentaire: form.commentaire.trim() || null, visible: form.visible, auteur,
    });
    if (error) setErreur(error.message);
    else { setForm({ discipline: 0, comportement: 0, progression: 0, commentaire: "", visible: true }); setAjoutOuvert(false); await charger(); }
    setEnvoi(false);
  }

  async function ajouterPhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setEnvoiPhoto(true);
    setErreur("");
    try {
      const blob = await compressImage(file, 1200, 0.8);
      const chemin = `galerie/${joueur.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { error: eUp } = await supabase.storage.from("academy_photos").upload(chemin, blob, { contentType: "image/jpeg", upsert: false });
      if (eUp) throw eUp;
      const url = supabase.storage.from("academy_photos").getPublicUrl(chemin).data.publicUrl;
      const { error } = await supabase.from("academy_galerie").insert({ registration_id: joueur.id, url, auteur });
      if (error) throw error;
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi de la photo impossible.");
    }
    setEnvoiPhoto(false);
  }

  async function basculer(table: "academy_evaluations" | "academy_galerie", id: number, visible: boolean) {
    await supabase.from(table).update({ visible: !visible }).eq("id", id);
    await charger();
  }
  async function supprimer(table: "academy_evaluations" | "academy_galerie", id: number) {
    if (!confirm("Supprimer définitivement ?")) return;
    await supabase.from(table).delete().eq("id", id);
    await charger();
  }

  const taux = assiduite && assiduite.total > 0 ? Math.round((assiduite.presentes / assiduite.total) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFermer}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111] p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <Avatar j={joueur} taille="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white">{joueur.prenom} {joueur.nom}</p>
            <p className="text-sm text-white/50">{joueur.categorie_foot || "—"}{age(joueur.date_naissance) !== null ? ` · ${age(joueur.date_naissance)} ans` : ""}</p>
          </div>
          <button onClick={onFermer} className="rounded-full p-1.5 text-white/40 hover:text-white"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          {joueur.telephone_parent && (
            <a href={`tel:${joueur.telephone_parent}`} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-white/70"><Phone className="h-3.5 w-3.5" /> {joueur.telephone_parent}</a>
          )}
          <div className={cn("rounded-lg px-3 py-2", joueur.autorisation_sortie === false ? "bg-red-500/10 text-red-300" : "bg-white/5 text-white/60")}>
            {joueur.autorisation_sortie === false ? "Ne rentre pas seul" : joueur.autorisation_sortie ? "Peut rentrer seul" : "Sortie : non renseigné"}
          </div>
          <div className="col-span-2 rounded-lg bg-white/5 px-3 py-2 text-white/60">
            Assiduité (2 mois) : <strong className="text-fiver-green">{taux === null ? "—" : `${taux} %`}</strong>
            {assiduite && assiduite.total > 0 && <span className="text-white/40"> · {assiduite.presentes}/{assiduite.total} séances</span>}
          </div>
        </div>

        {erreur && <p className="mb-3 text-sm text-red-300">{erreur}</p>}

        {/* Évaluations */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-white/70">Évaluations</h3>
          {!ajoutOuvert && <button onClick={() => setAjoutOuvert(true)} className="flex items-center gap-1 rounded-lg bg-fiver-green px-3 py-1.5 text-xs font-bold text-fiver-black"><Plus className="h-3.5 w-3.5" /> Ajouter</button>}
        </div>
        {ajoutOuvert && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-fiver-green/20 bg-fiver-green/5 p-3">
            {(["discipline", "comportement", "progression"] as const).map(k => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span className="text-sm capitalize text-white/70">{k}</span>
                <Notes valeur={form[k]} onChange={n => setForm({ ...form, [k]: form[k] === n ? 0 : n })} />
              </div>
            ))}
            <textarea value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} rows={3} placeholder="Commentaire sur son évolution…" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} className="h-4 w-4 accent-[#00c26e]" />
              Visible par les parents
            </label>
            <div className="flex gap-2">
              <button onClick={() => setAjoutOuvert(false)} className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm text-white/60">Annuler</button>
              <button onClick={ajouterEvaluation} disabled={envoi} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-fiver-green py-2.5 text-sm font-bold text-fiver-black disabled:opacity-50">
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        )}
        <div className="mb-5 flex flex-col gap-2">
          {evals.length === 0 && !ajoutOuvert && <p className="text-xs text-white/30">Aucune évaluation.</p>}
          {evals.map(e => (
            <div key={e.id} className={cn("rounded-lg border border-white/5 bg-white/[0.03] p-3", !e.visible && "opacity-60")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-white/40">{new Date(e.date_eval + "T00:00:00").toLocaleDateString("fr-FR")}{e.auteur ? ` · ${e.auteur}` : ""}{!e.visible ? " · masquée aux parents" : ""}</p>
                <div className="flex gap-1">
                  <button onClick={() => basculer("academy_evaluations", e.id, e.visible)} className="p-1 text-white/30 hover:text-white" title={e.visible ? "Masquer aux parents" : "Montrer aux parents"}>
                    {e.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  {(admin || e.auteur === auteur) && (
                    <button onClick={() => supprimer("academy_evaluations", e.id)} className="p-1 text-red-400/50 hover:text-red-400" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-white/60">
                Discipline {e.discipline ?? "—"}/5 · Comportement {e.comportement ?? "—"}/5 · Progression {e.progression ?? "—"}/5
              </p>
              {e.commentaire && <p className="mt-1.5 whitespace-pre-line text-sm text-white/80">{e.commentaire}</p>}
            </div>
          ))}
        </div>

        {/* Photos */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-white/70">Photos</h3>
          {photosAutorisees && (
            <>
              <input ref={inputPhoto} type="file" accept="image/*" capture="environment" className="hidden" onChange={ajouterPhoto} />
              <button onClick={() => inputPhoto.current?.click()} disabled={envoiPhoto} className="flex items-center gap-1 rounded-lg bg-fiver-green px-3 py-1.5 text-xs font-bold text-fiver-black disabled:opacity-50">
                {envoiPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Photo
              </button>
            </>
          )}
        </div>
        {!photosAutorisees ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">Les parents n&apos;autorisent pas les photos de cet enfant.</p>
        ) : photos.length === 0 ? (
          <p className="text-xs text-white/30">Aucune photo.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(p => (
              <div key={p.id} className={cn("relative aspect-square overflow-hidden rounded-lg bg-white/5", !p.visible && "opacity-50")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute right-1 top-1 flex gap-1">
                  <button onClick={() => basculer("academy_galerie", p.id, p.visible)} className="rounded-full bg-black/60 p-1 text-white/80" title={p.visible ? "Masquer aux parents" : "Montrer aux parents"}>
                    {p.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  {(admin || p.auteur === auteur) && (
                    <button onClick={() => supprimer("academy_galerie", p.id)} className="rounded-full bg-black/60 p-1 text-red-300" title="Supprimer"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
