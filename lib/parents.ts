import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import {
  getMonthStatus, mensualiteFiche, debutSaison, currentMonthStr, lirePlanning, estArrete,
  type MonthStatus, type PlanningAcademy, type TarifsMensuels,
} from "@/lib/academy";

// ---------- Types renvoyés par parent_donnees ----------

export interface PaiementParent { id: number; mois_concerne: string; montant: number; moyen_paiement: string | null; description: string | null; date_paiement: string }
export interface LignePreuve { mois: string; montant: number }
export interface PreuveParent {
  id: number; mois_concerne: string; montant: number; moyen_paiement: string | null; statut: "en_attente" | "valide" | "refuse";
  motif_refus: string | null; created_at: string; traite_le?: string | null; note?: string | null; depose_par?: string | null;
  /** Mois couverts par un même dépôt (paiement de plusieurs mois en une fois) */
  details?: LignePreuve[] | null;
}
export interface EvaluationParent { id: number; date_eval: string; discipline: number | null; comportement: number | null; progression: number | null; commentaire: string | null; auteur: string | null; created_at?: string }
export interface PhotoParent { id: number; url: string; legende: string | null; created_at: string }
export interface SeanceParent { date: string; reponse: "present" | "absent" | null; presence: "present" | "absent" | null }

export interface EnfantParent {
  id: number; nom: string; prenom: string; date_naissance: string | null; sexe: string; telephone_parent: string | null;
  categorie_foot: string | null; football: boolean; centre_loisirs: boolean; coran?: boolean; coran_debut?: string | null;
  statut_inscription?: string | null; date_arret?: string | null;
  photo_url: string | null; badge_code: string | null; saison: string; created_at: string;
  tarif_total: number; frais_inscription: number; frais_inscription_paye: boolean; inscription_fin_de_mois: boolean;
  autorisation_photos: boolean; autorisation_sortie: boolean | null;
  academy_payments_history: PaiementParent[];
  preuves: PreuveParent[];
  evaluations: EvaluationParent[];
  photos: PhotoParent[];
  seances: SeanceParent[];
  scans: string[];
}

export interface AnnonceParent { id: number; titre: string; contenu: string | null; categorie: string | null; photos?: string[] | null; created_at: string }
export interface MessageParent { id: number; sens: "parent" | "academie"; contenu: string; auteur: string | null; lu: boolean; created_at: string }

export interface DonneesParent {
  parent: { telephone: string; nom: string | null };
  saison: string;
  tarifs: (TarifsMensuels & { jourLimitePaiement?: number; fraisInscription?: number; fraisInscriptionAncien?: number; numeroPaiement?: string }) | null;
  planning: PlanningAcademy;
  enfants: EnfantParent[];
  annonces: AnnonceParent[];
  messages: MessageParent[];
}

// ---------- Session ----------

const CLE_TOKEN = "fiveur_parent_token";

export const sessionParent = {
  get(): string | null { try { return localStorage.getItem(CLE_TOKEN); } catch { return null; } },
  set(t: string) { try { localStorage.setItem(CLE_TOKEN, t); } catch {} },
  clear() { try { localStorage.removeItem(CLE_TOKEN); } catch {} },
};

export class SessionExpiree extends Error {}

const MESSAGES: Record<string, string> = {
  TELEPHONE_INVALIDE: "Numéro de téléphone invalide.",
  MOT_DE_PASSE_COURT: "Le mot de passe doit contenir au moins 6 caractères.",
  COMPTE_EXISTE: "Un compte existe déjà pour ce numéro. Connectez-vous.",
  CODE_INCORRECT: "Numéro ou code joueur incorrect. Le code est imprimé sur la carte de votre enfant.",
  IDENTIFIANTS_ENFANT: "Numéro ou prénom incorrect. Utilisez le numéro donné à l'inscription et le prénom de votre enfant.",
  IDENTIFIANTS: "Numéro ou mot de passe incorrect.",
  BLOQUE: "Trop d'essais. Réessayez dans 15 minutes.",
  COMPTE_DESACTIVE: "Ce compte a été désactivé. Contactez l'académie.",
  ENFANT_INCONNU: "Enfant introuvable.",
  IMAGE_INVALIDE: "Image invalide ou trop lourde.",
  MOIS_INVALIDE: "Mois invalide.",
  MONTANT_INVALIDE: "Montant invalide.",
  TROP_DE_DEPOTS: "Trop de paiements en attente de validation pour cet enfant.",
  DEJA_EN_ATTENTE: "Un paiement est déjà en cours de vérification pour l'un de ces mois.",
  CAPTURE_REQUISE: "Ajoutez la capture d'écran du paiement.",
  DATE_INVALIDE: "Cette séance n'est plus modifiable.",
  MESSAGE_INVALIDE: "Message vide ou trop long.",
  TROP_DE_MESSAGES: "Trop de messages envoyés. Réessayez plus tard.",
};

export function messageErreur(code: string) {
  const cle = Object.keys(MESSAGES).find(k => code.includes(k));
  return cle ? MESSAGES[cle] : "Une erreur est survenue. Réessayez.";
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.message.includes("SESSION_EXPIREE")) { sessionParent.clear(); throw new SessionExpiree(); }
    throw new Error(messageErreur(error.message));
  }
  return data as T;
}

/** Appel d'une fonction parent_* avec le jeton de session. */
export function appelParent<T = void>(fn: string, args: Record<string, unknown> = {}) {
  return rpc<T>(fn, { p_token: sessionParent.get(), ...args });
}

/** Connexion avec le numéro donné à l'inscription et le prénom d'un de ses enfants. */
export async function connexionParent(telephone: string, prenomEnfant: string) {
  const r = await rpc<{ token?: string; erreur?: string }>("parent_connexion_enfant", { p_telephone: telephone, p_prenom: prenomEnfant });
  if (!r?.token) throw new Error(messageErreur(r?.erreur || ""));
  sessionParent.set(r.token);
}

export async function chargerDonneesParent(): Promise<DonneesParent> {
  const d = await appelParent<DonneesParent>("parent_donnees");
  return { ...d, planning: lirePlanning(d.planning) };
}

export async function deconnexionParent() {
  const t = sessionParent.get();
  sessionParent.clear();
  if (t) await supabase.rpc("parent_deconnexion", { p_token: t });
}

export async function imageEnDataUrl(file: File, maxSize = 1000) {
  const blob = await compressImage(file, maxSize, 0.75);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---------- Paiements ----------

export type StatutMois = "paye" | "partiel" | "a_payer" | "retard" | "offert" | "a_venir" | "avant_saison" | "en_verification" | "arrete";

/** Lignes d'un dépôt : un ou plusieurs mois (ou les frais), chacun avec son montant. */
export function lignesPreuve(p: Pick<PreuveParent, "mois_concerne" | "montant" | "details">): LignePreuve[] {
  return p.details && p.details.length > 0 ? p.details : [{ mois: p.mois_concerne, montant: p.montant }];
}

export function libelleDepot(p: Pick<PreuveParent, "mois_concerne" | "montant" | "details">) {
  return lignesPreuve(p).map(l => libelleMois(l.mois)).join(" + ");
}

function enVerification(e: EnfantParent, mois: string) {
  return e.preuves.some(p => p.statut === "en_attente" && lignesPreuve(p).some(l => l.mois === mois));
}

export function fraisEnVerification(e: EnfantParent) {
  return enVerification(e, "FRAIS");
}

export function statutMoisEnfant(e: EnfantParent, mois: string, tarifs: DonneesParent["tarifs"]): { statut: StatutMois; du: number; paye: number } {
  const t = tarifs || { tarifFoot: 0, tarifLoisirs: 0, tarifCombo: 0 };
  const du = mensualiteFiche(e, t, mois) || e.tarif_total;
  const paye = e.academy_payments_history.filter(h => h.mois_concerne === mois && h.moyen_paiement !== "OFF").reduce((s, h) => s + h.montant, 0);
  const debut = debutSaison(e.saison);
  if (debut && mois < debut) return { statut: "avant_saison", du, paye };
  // Mois d'avant l'inscription (ex : réinscrit en novembre) : rien à payer, comme dans le tableau de bord admin
  const moisInscription = e.created_at ? currentMonthStr(new Date(e.created_at)) : null;
  if (moisInscription && mois < moisInscription && paye === 0) return { statut: "avant_saison", du, paye };
  if (estArrete(e, mois)) return { statut: "arrete", du, paye };
  if (e.inscription_fin_de_mois && currentMonthStr(new Date(e.created_at)) === mois) return { statut: "offert", du, paye };
  const s: MonthStatus = getMonthStatus(e, mois, du);
  if (s === "off") return { statut: "offert", du, paye };
  if (s === "paye") return { statut: "paye", du, paye };
  // Capture déposée, pas encore validée par l'académie
  if (enVerification(e, mois)) return { statut: "en_verification", du, paye };
  if (s === "partiel") return { statut: "partiel", du, paye };
  const actuel = currentMonthStr();
  if (mois > actuel) return { statut: "a_venir", du, paye };
  const jourLimite = tarifs?.jourLimitePaiement || 10;
  if (mois < actuel || new Date().getDate() > jourLimite) return { statut: "retard", du, paye };
  return { statut: "a_payer", du, paye };
}

export const LIBELLE_STATUT: Record<StatutMois, string> = {
  paye: "Payé", partiel: "Partiel", a_payer: "À payer", retard: "En retard",
  offert: "Offert", a_venir: "À venir", avant_saison: "—", en_verification: "En vérification", arrete: "Arrêté",
};

export function libelleMois(mois: string) {
  if (mois === "FRAIS") return "Frais d'inscription";
  const d = new Date(mois + "-01T00:00:00");
  const l = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export const MOYENS_PAIEMENT_PARENT = ["Bankily", "Masrvi", "Sedad", "Bimbank", "Cash", "Autre"];
/** Moyens pour lesquels aucune capture d'écran n'est demandée */
export const MOYENS_SANS_CAPTURE = ["Cash", "Autre"];

/** Numéro sur lequel les parents envoient leurs paiements (réglable dans Paramètres). */
export const NUMERO_PAIEMENT_DEFAUT = "48 86 92 79";

// ---------- Notifications (ce que le parent n'a pas encore vu) ----------

export type Vus = Record<string, string>;

const cleVus = (tel: string) => `fiveur_vus_${tel}`;

/** Dates de dernière consultation par rubrique ; au tout premier passage, tout l'existant compte comme vu. */
export function lireVus(tel: string): Vus {
  try {
    const brut = localStorage.getItem(cleVus(tel));
    if (brut) return JSON.parse(brut);
    const init = { init: new Date().toISOString() };
    localStorage.setItem(cleVus(tel), JSON.stringify(init));
    return init;
  } catch {
    return { init: new Date().toISOString() };
  }
}

export function marquerVu(tel: string, vus: Vus, cle: string): Vus {
  const next = { ...vus, [cle]: new Date().toISOString() };
  try { localStorage.setItem(cleVus(tel), JSON.stringify(next)); } catch {}
  return next;
}

// Dates comparées en millisecondes (la base et le navigateur n'écrivent pas les dates pareil)
const apres = (date: string | null | undefined, vus: Vus, cle: string) =>
  !!date && Date.parse(date) > Date.parse(vus[cle] || vus.init || "1970-01-01");

export interface NotifsEnfant { paiements: PreuveParent[]; photos: number; evaluations: number }

export function notificationsEnfant(e: EnfantParent, vus: Vus): NotifsEnfant {
  return {
    paiements: e.preuves.filter(p => p.statut !== "en_attente" && apres(p.traite_le, vus, `paiements:${e.id}`)),
    photos: e.photos.filter(p => apres(p.created_at, vus, `photos:${e.id}`)).length,
    evaluations: e.evaluations.filter(ev => apres(ev.created_at, vus, `suivi:${e.id}`)).length,
  };
}

export function nouvellesAnnonces(d: DonneesParent, vus: Vus) {
  return d.annonces.filter(a => apres(a.created_at, vus, "annonces"));
}
