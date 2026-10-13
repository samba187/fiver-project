import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import {
  getMonthStatus, mensualiteFiche, debutSaison, currentMonthStr, lirePlanning,
  type MonthStatus, type PlanningAcademy, type TarifsMensuels,
} from "@/lib/academy";

// ---------- Types renvoyés par parent_donnees ----------

export interface PaiementParent { id: number; mois_concerne: string; montant: number; moyen_paiement: string | null; description: string | null; date_paiement: string }
export interface PreuveParent { id: number; mois_concerne: string; montant: number; moyen_paiement: string | null; statut: "en_attente" | "valide" | "refuse"; motif_refus: string | null; created_at: string }
export interface EvaluationParent { id: number; date_eval: string; discipline: number | null; comportement: number | null; progression: number | null; commentaire: string | null; auteur: string | null }
export interface PhotoParent { id: number; url: string; legende: string | null; created_at: string }
export interface SeanceParent { date: string; reponse: "present" | "absent" | null; presence: "present" | "absent" | null }

export interface EnfantParent {
  id: number; nom: string; prenom: string; date_naissance: string | null; sexe: string;
  categorie_foot: string | null; football: boolean; centre_loisirs: boolean;
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

export interface AnnonceParent { id: number; titre: string; contenu: string | null; categorie: string | null; created_at: string }
export interface MessageParent { id: number; sens: "parent" | "academie"; contenu: string; auteur: string | null; lu: boolean; created_at: string }

export interface DonneesParent {
  parent: { telephone: string; nom: string | null };
  saison: string;
  tarifs: (TarifsMensuels & { jourLimitePaiement?: number; fraisInscription?: number; fraisInscriptionAncien?: number }) | null;
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
  IDENTIFIANTS: "Numéro ou mot de passe incorrect. Première visite ? Créez d'abord votre compte avec l'onglet « Créer mon compte ».",
  BLOQUE: "Trop d'essais. Réessayez dans 15 minutes.",
  COMPTE_DESACTIVE: "Ce compte a été désactivé. Contactez l'académie.",
  ENFANT_INCONNU: "Enfant introuvable.",
  IMAGE_INVALIDE: "Image invalide ou trop lourde.",
  MOIS_INVALIDE: "Mois invalide.",
  MONTANT_INVALIDE: "Montant invalide.",
  TROP_DE_DEPOTS: "Trop de paiements en attente de validation pour cet enfant.",
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

export async function connexionParent(telephone: string, motDePasse: string) {
  const r = await rpc<{ token?: string; erreur?: string }>("parent_connexion", { p_telephone: telephone, p_mot_de_passe: motDePasse });
  if (!r?.token) throw new Error(messageErreur(r?.erreur || ""));
  sessionParent.set(r.token);
}

export async function creerCompteParent(telephone: string, codeJoueur: string, motDePasse: string, nom: string) {
  const r = await rpc<{ token?: string; erreur?: string }>("parent_creer_compte", {
    p_telephone: telephone, p_code_joueur: codeJoueur, p_mot_de_passe: motDePasse, p_nom: nom || null,
  });
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

export type StatutMois = "paye" | "partiel" | "a_payer" | "retard" | "offert" | "a_venir" | "avant_saison" | "en_verification";

export function fraisEnVerification(e: EnfantParent) {
  return e.preuves.some(p => p.mois_concerne === "FRAIS" && p.statut === "en_attente");
}

export function statutMoisEnfant(e: EnfantParent, mois: string, tarifs: DonneesParent["tarifs"]): { statut: StatutMois; du: number; paye: number } {
  const t = tarifs || { tarifFoot: 0, tarifLoisirs: 0, tarifCombo: 0 };
  const du = mensualiteFiche(e, t) || e.tarif_total;
  const paye = e.academy_payments_history.filter(h => h.mois_concerne === mois && h.moyen_paiement !== "OFF").reduce((s, h) => s + h.montant, 0);
  const debut = debutSaison(e.saison);
  if (debut && mois < debut) return { statut: "avant_saison", du, paye };
  if (e.inscription_fin_de_mois && currentMonthStr(new Date(e.created_at)) === mois) return { statut: "offert", du, paye };
  const s: MonthStatus = getMonthStatus(e, mois, du);
  if (s === "off") return { statut: "offert", du, paye };
  if (s === "paye") return { statut: "paye", du, paye };
  // Capture déposée, pas encore validée par l'académie
  if (e.preuves.some(p => p.mois_concerne === mois && p.statut === "en_attente")) return { statut: "en_verification", du, paye };
  if (s === "partiel") return { statut: "partiel", du, paye };
  const actuel = currentMonthStr();
  if (mois > actuel) return { statut: "a_venir", du, paye };
  const jourLimite = tarifs?.jourLimitePaiement || 10;
  if (mois < actuel || new Date().getDate() > jourLimite) return { statut: "retard", du, paye };
  return { statut: "a_payer", du, paye };
}

export const LIBELLE_STATUT: Record<StatutMois, string> = {
  paye: "Payé", partiel: "Partiel", a_payer: "À payer", retard: "En retard",
  offert: "Offert", a_venir: "À venir", avant_saison: "—", en_verification: "En vérification",
};

export function libelleMois(mois: string) {
  if (mois === "FRAIS") return "Frais d'inscription";
  const d = new Date(mois + "-01T00:00:00");
  const l = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export const MOYENS_PAIEMENT_PARENT = ["Bankily", "Masrvi", "Sedad", "Bimbank", "Cash", "Autre"];

// ---------- Reçu PDF ----------

export async function telechargerRecu(enfant: EnfantParent, p: PaiementParent) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const vert: [number, number, number] = [0, 166, 110];
  doc.setFillColor(...vert);
  doc.rect(0, 0, 148, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FIVEUR ACADEMY", 12, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reçu de paiement — Nouakchott", 12, 20);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  const lignes: [string, string][] = [
    ["Reçu N°", `REC-${String(enfant.id).padStart(4, "0")}-${p.id}`],
    ["Date du paiement", new Date(p.date_paiement).toLocaleDateString("fr-FR")],
    ["Joueur", `${enfant.prenom} ${enfant.nom}`],
    ["Catégorie", enfant.categorie_foot || "—"],
    ["Saison", enfant.saison],
    ["Objet", p.mois_concerne === "FRAIS" ? "Frais d'inscription" : `Mensualité — ${libelleMois(p.mois_concerne)}`],
    ["Moyen de paiement", p.moyen_paiement || "—"],
  ];
  let y = 40;
  for (const [k, v] of lignes) {
    doc.setTextColor(120, 120, 120);
    doc.text(k, 12, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(v, 136, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(230, 230, 230);
    doc.line(12, y + 3, 136, y + 3);
    y += 10;
  }
  doc.setFillColor(235, 250, 243);
  doc.roundedRect(12, y + 4, 124, 22, 3, 3, "F");
  doc.setTextColor(...vert);
  doc.setFontSize(9);
  doc.text("MONTANT PAYÉ", 74, y + 12, { align: "center" });
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${p.montant.toLocaleString("fr-FR").replace(/ | /g, " ")} MRU`, 74, y + 21, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Document généré depuis l'Espace Parents Fiveur Academy.", 74, 200, { align: "center" });
  doc.save(`recu-${enfant.prenom}-${p.mois_concerne}.pdf`);
}
