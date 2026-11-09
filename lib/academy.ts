import { supabase } from "@/lib/supabase";

export const SAISON_FALLBACK = "2025-2026";

export type MonthStatus = "paye" | "partiel" | "non_paye" | "off";

export const ACADEMY_CATEGORIES = ["U5", "U7", "U9", "U11", "U12F", "U13", "U13 Elite", "U15", "U15F", "U17"];

/**
 * Catégories par année de naissance (comme l'affiche des horaires) : pour la saison
 * 2026-2027, U5 = 2021-2022, U7 = 2019-2020, … U17 = 2009-2010.
 * Les plus jeunes (nés après) vont aussi en U5. U13 Elite se choisit à la main.
 */
const CATEGORIES_PAR_ANNEE: [string, number][] = [["U5", 5], ["U7", 7], ["U9", 9], ["U11", 11], ["U13", 13], ["U15", 15], ["U17", 17]];

function anneeFinSaison(saison: string | null | undefined) {
  const fin = parseInt((saison || "").split("-")[1] || "");
  if (fin) return fin;
  const d = new Date();
  return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
}

/** Années de naissance d'une catégorie pour une saison, ex : "2021-2022". */
export function anneesCategorie(cat: string, saison?: string | null): string {
  const fin = anneeFinSaison(saison);
  const base = cat === "U13 Elite" ? 13 : cat === "U12F" ? 12 : cat === "U15F" ? 15 : CATEGORIES_PAR_ANNEE.find(([c]) => c === cat)?.[1];
  if (!base) return "";
  if (cat === "U12F") return `filles ${fin - 13}-${fin - 9}`;
  if (cat === "U15F") return `filles ${fin - 16}-${fin - 14}`;
  return `${fin - base - 1}-${fin - base}`;
}

/** Catégorie proposée d'après la date de naissance et la saison. */
export function categorieParNaissance(dateNaissance: string | null | undefined, isGirl: boolean, saison?: string | null): string {
  const annee = dateNaissance ? parseInt(dateNaissance.slice(0, 4)) : NaN;
  if (!annee) return "";
  const fin = anneeFinSaison(saison);
  if (annee >= fin - 8) return annee >= fin - 6 ? "U5" : "U7";
  if (isGirl && annee >= fin - 13) return "U12F";
  if (isGirl && annee >= fin - 16) return "U15F";
  for (const [cat, base] of CATEGORIES_PAR_ANNEE) if (annee >= fin - base - 1) return cat;
  return "";
}

/** Catégories présentes dans une liste d'inscrits, dans l'ordre officiel (+ anciennes catégories éventuelles à la fin). */
export function categoriesPresentes(cats: (string | null | undefined)[]): string[] {
  const presentes = new Set(cats.filter((c): c is string => !!c));
  return [...ACADEMY_CATEGORIES.filter(c => presentes.has(c)), ...[...presentes].filter(c => !ACADEMY_CATEGORIES.includes(c)).sort()];
}


export interface PaymentHistoryEntry {
  mois_concerne: string;
  montant: number;
  moyen_paiement?: string | null;
}

export interface AbonnementSource {
  tarif_total: number;
  academy_payments_history?: PaymentHistoryEntry[] | null;
  statut_inscription?: string | null;
  date_arret?: string | null;
}

// ---------- Enfant qui arrête en cours de saison ----------

export interface FicheArret { statut_inscription?: string | null; date_arret?: string | null }

/** Premier mois ("YYYY-MM") où l'enfant n'est plus inscrit, ou null s'il est actif. */
export function moisArret(r: FicheArret): string | null {
  return r.statut_inscription === "arrete" && r.date_arret ? r.date_arret.slice(0, 7) : null;
}

/** L'enfant a-t-il arrêté à ce mois-ci (par défaut le mois en cours) ? */
export function estArrete(r: FicheArret, mois = currentMonthStr()): boolean {
  const m = moisArret(r);
  return !!m && mois >= m;
}

/**
 * Un paiement enregistré avec le moyen "OFF" marque un mois offert/suspendu,
 * il ne compte pas comme un encaissement.
 */
export function getMonthStatus(r: AbonnementSource, monthStr: string, tarifMensuel?: number): MonthStatus {
  // Enfant arrêté : plus rien à payer à partir de son mois d'arrêt
  if (estArrete(r, monthStr)) return "off";
  const history = r.academy_payments_history || [];
  const allPayments = history.filter((h) => h.mois_concerne === monthStr);

  const hasOff = allPayments.some((h) => h.moyen_paiement === "OFF");
  const realPayments = allPayments.filter((h) => h.moyen_paiement !== "OFF");

  if (hasOff && realPayments.length === 0) return "off";
  if (realPayments.length === 0) return "non_paye";

  const totalPaid = realPayments.reduce((acc, h) => acc + h.montant, 0);
  const seuil = tarifMensuel || r.tarif_total;
  if (totalPaid > 0 && totalPaid >= seuil) return "paye";
  if (totalPaid > 0) return "partiel";
  return "paye";
}

export function currentMonthStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchSaisonCourante(): Promise<string> {
  const { data } = await supabase.from("settings").select("value").eq("key", "saison_courante").maybeSingle();
  return data?.value || SAISON_FALLBACK;
}

/**
 * Mois couverts par une saison ("YYYY-MM"), d'après ses dates si elles existent,
 * sinon octobre → septembre déduits du nom ("2026-2027").
 */
export function moisDeSaison(nom: string, dates?: { date_debut: string | null; date_fin: string | null }): string[] {
  let debut: Date | null = null;
  let fin: Date | null = null;
  if (dates?.date_debut && dates?.date_fin) {
    debut = new Date(dates.date_debut + "T00:00:00");
    fin = new Date(dates.date_fin + "T00:00:00");
  } else {
    const match = nom.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      debut = new Date(parseInt(match[1], 10), 9, 1);
      fin = new Date(parseInt(match[2], 10), 8, 1);
    }
  }
  if (!debut || !fin || fin < debut) {
    const y = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
  }
  const mois: string[] = [];
  const cur = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (cur <= fin && mois.length < 24) {
    mois.push(currentMonthStr(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return mois;
}

/** Premier mois d'une saison "2026-2027" -> "2026-10" (les saisons vont d'octobre à septembre) */
export function debutSaison(saison: string | null | undefined): string | null {
  const m = saison?.match(/^(\d{4})-(\d{4})$/);
  return m ? `${m[1]}-10` : null;
}

/** Dernier mois d'une saison "2026-2027" -> "2027-09" */
export function finSaison(saison: string | null | undefined): string | null {
  const m = saison?.match(/^(\d{4})-(\d{4})$/);
  return m ? `${m[2]}-09` : null;
}

// ---------- Tarifs ----------

export interface TarifsMensuels {
  tarifFoot: number;
  tarifLoisirs: number;
  tarifCombo: number;
  /** Mensualité football par catégorie (ex : U5, filles moins chers). Absent = tarifFoot. */
  tarifsCategorie?: Record<string, number>;
  /** Supplément mensuel des cours de Coran. Absent = 300 MRU. */
  tarifCoran?: number;
}

export const TARIF_CORAN_DEFAUT = 300;

export interface FicheTarifable {
  football: boolean;
  centre_loisirs: boolean;
  categorie_foot: string | null;
  coran?: boolean | null;
  /** Premier mois ("YYYY-MM") où le Coran est facturé. Vide = toute la saison. */
  coran_debut?: string | null;
}

/** Le Coran est-il facturé ce mois-ci ? (sans mois : la mensualité actuelle) */
export function coranFacture(r: FicheTarifable, mois?: string): boolean {
  if (!r.coran) return false;
  return !mois || !r.coran_debut || mois >= r.coran_debut;
}

/** Mensualité due par une fiche, selon sa catégorie et ses prestations (pour un mois donné si précisé). */
export function mensualiteFiche(r: FicheTarifable, t: TarifsMensuels, mois?: string): number {
  const prixCat = r.categorie_foot ? t.tarifsCategorie?.[r.categorie_foot] : undefined;
  const foot = prixCat && prixCat > 0 ? prixCat : t.tarifFoot;
  // Le combo garde la même remise que Foot + Loisirs au tarif standard
  const remiseCombo = Math.max(0, t.tarifFoot + t.tarifLoisirs - t.tarifCombo);
  let base = 0;
  if (r.football && r.centre_loisirs) base = Math.max(0, foot + t.tarifLoisirs - remiseCombo);
  else if (r.football) base = foot;
  else if (r.centre_loisirs) base = t.tarifLoisirs;
  // Cours de Coran : supplément ajouté à la mensualité
  return base + (coranFacture(r, mois) ? t.tarifCoran ?? TARIF_CORAN_DEFAUT : 0);
}

// ---------- État d'un mois : LA règle commune à tous les écrans ----------
// Grille admin, Espace Parents, fiche joueur, tableau de bord, scanner et rappels
// passent tous par etatMois() : un mois a le même état partout.

export type EtatMois =
  | "avant_saison"      // mois d'avant la saison de la fiche
  | "avant_inscription" // mois d'avant le mois d'inscription (rien de payé)
  | "offert"            // inscrit en fin de mois : son premier mois est offert
  | "arrete"            // enfant arrêté à partir de ce mois
  | "off"               // mois mis en pause (OFF)
  | "paye" | "partiel"
  | "a_payer"           // mois en cours, avant le jour limite
  | "retard"            // mois passé, ou mois en cours après le jour limite
  | "a_venir";

export interface FicheMois extends FicheTarifable, AbonnementSource {
  saison?: string | null;
  created_at?: string | null;
  inscription_fin_de_mois?: boolean | null;
}

export interface ResultatMois {
  etat: EtatMois;
  /** Mensualité de ce mois */
  du: number;
  /** Encaissé pour ce mois (hors OFF) */
  paye: number;
  /** Ce qu'il reste à payer (0 si rien n'est dû ce mois-ci) */
  reste: number;
  /** Le mois compte-t-il dans ce que l'enfant doit (tableau de bord, relances) ? */
  exigible: boolean;
}

export function etatMois(
  r: FicheMois, mois: string,
  options: { tarifs?: TarifsMensuels | null; du?: number; jourLimite?: number; aujourdhui?: Date },
): ResultatMois {
  const historique = (r.academy_payments_history || []).filter(h => h.mois_concerne === mois);
  const paye = historique.filter(h => h.moyen_paiement !== "OFF").reduce((s, h) => s + (Number(h.montant) || 0), 0);
  const du = options.du ?? ((options.tarifs ? mensualiteFiche(r, options.tarifs, mois) : 0) || r.tarif_total || 0);
  const res = (etat: EtatMois, exigible: boolean): ResultatMois => ({ etat, du, paye, exigible, reste: exigible ? Math.max(0, du - paye) : 0 });

  const debut = debutSaison(r.saison);
  if (debut && mois < debut) return res("avant_saison", false);
  if (estArrete(r, mois)) return res("arrete", false);
  if (historique.some(h => h.moyen_paiement === "OFF") && paye === 0) return res("off", false);
  const moisInscription = r.created_at ? currentMonthStr(new Date(r.created_at)) : null;
  if (r.inscription_fin_de_mois && moisInscription === mois) return res("offert", false);
  if (moisInscription && mois < moisInscription && paye === 0) return res("avant_inscription", false);

  if (paye > 0 && paye >= du) return res("paye", true);
  if (paye > 0) return res("partiel", true);
  const aujourdhui = options.aujourdhui || new Date();
  const actuel = currentMonthStr(aujourdhui);
  if (mois > actuel) return res("a_venir", true);
  if (mois < actuel || aujourdhui.getDate() > (options.jourLimite || 10)) return res("retard", true);
  return res("a_payer", true);
}

/** Scanner de l'accueil : statut à afficher pour le mois en cours (même règle que partout). */
export function statutAccueil(r: FicheMois, tarifs: TarifsMensuels | null, jourLimite: number, aujourdhui = new Date()): { statut: MonthStatus; enDelai: boolean } {
  const e = etatMois(r, currentMonthStr(aujourdhui), { tarifs, jourLimite, aujourdhui });
  const statut: MonthStatus = !e.exigible ? "off" : e.etat === "paye" ? "paye" : e.etat === "partiel" ? "partiel" : "non_paye";
  return { statut, enDelai: e.etat === "a_payer" };
}

// ---------- Planning des entraînements ----------

export interface CreneauPlanning {
  jours: number[];   // 0 = dimanche … 6 = samedi
  heure: string;     // "15h45 - 17h00"
  terrain: string;
}
export type PlanningAcademy = Record<string, CreneauPlanning>;

export const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// Horaires d'entraînement saison 2026-2027 (0 = dimanche … 6 = samedi)
export const DEFAULT_PLANNING: PlanningAcademy = {
  "U5": { jours: [3, 5], heure: "16h - 17h", terrain: "Terrain 1" },
  "U7": { jours: [3, 5], heure: "17h - 18h", terrain: "Terrain 1" },
  "U9": { jours: [3, 5], heure: "17h - 18h", terrain: "Terrain 2" },
  "U11": { jours: [3, 5], heure: "18h - 19h", terrain: "Terrain 2" },
  "U12F": { jours: [0], heure: "17h - 18h", terrain: "Terrain 2" },
  "U13": { jours: [3, 5], heure: "18h - 19h", terrain: "Terrain 1" },
  "U13 Elite": { jours: [2, 4], heure: "18h - 19h", terrain: "Terrain 1" },
  "U15": { jours: [3, 5], heure: "16h - 17h", terrain: "Terrain 2" },
  "U15F": { jours: [0], heure: "17h - 18h", terrain: "Terrain 2" },
  "U17": { jours: [3, 5], heure: "16h - 17h", terrain: "Terrain 2" },
};

export function lirePlanning(valeur: unknown): PlanningAcademy {
  const base: PlanningAcademy = { ...DEFAULT_PLANNING };
  if (valeur && typeof valeur === "object") {
    for (const [cat, c] of Object.entries(valeur as Record<string, Partial<CreneauPlanning>>)) {
      base[cat] = { jours: Array.isArray(c?.jours) ? c.jours : [], heure: c?.heure || "", terrain: c?.terrain || "" };
    }
  }
  return base;
}

export async function fetchPlanning(): Promise<PlanningAcademy> {
  const { data } = await supabase.from("settings").select("value").eq("key", "academy_planning").maybeSingle();
  try { return lirePlanning(data?.value ? JSON.parse(data.value) : null); } catch { return lirePlanning(null); }
}

export function dateLocale(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dates des séances d'une catégorie entre deux dates incluses ("YYYY-MM-DD"). */
export function seancesEntre(planning: PlanningAcademy, categorie: string | null, debut: string, fin: string): string[] {
  const jours = (categorie && planning[categorie]?.jours) || [];
  if (jours.length === 0) return [];
  const out: string[] = [];
  const d = new Date(debut + "T00:00:00");
  const f = new Date(fin + "T00:00:00");
  while (d <= f && out.length < 400) {
    if (jours.includes(d.getDay())) out.push(dateLocale(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function decalerJours(date: string, n: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dateLocale(d);
}

/** 8 derniers chiffres d'un numéro (même règle que la fonction SQL tel8). */
export function tel8(tel: string | null | undefined) {
  return (tel || "").replace(/\D/g, "").slice(-8);
}

/** "2025-2026" -> "2026-2027" */
export function suggestNextSaison(current: string): string {
  const match = current.match(/^(\d{4})-(\d{4})$/);
  if (!match) return current;
  return `${parseInt(match[1], 10) + 1}-${parseInt(match[2], 10) + 1}`;
}

const BADGE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Même alphabet que la fonction SQL : pas de 0/O ni 1/I pour la saisie manuelle de secours. */
export function generateBadgeCode(length = 8): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BADGE_ALPHABET[bytes[i] % BADGE_ALPHABET.length];
  }
  return out;
}
