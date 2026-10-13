import { supabase } from "@/lib/supabase";

export const SAISON_FALLBACK = "2025-2026";

export type MonthStatus = "paye" | "partiel" | "non_paye" | "off";

export const ACADEMY_CATEGORIES = ["Baby", "U5/U7", "U9", "U11", "U12F", "U13", "U15", "U15F", "U17", "U19", "Senior"];

export const CATEGORY_AGES: Record<string, string> = {
  "Baby": "2-4 ans",
  "U5/U7": "5-7 ans",
  "U17": "16-17 ans",
  "U19": "18-19 ans",
  "Senior": "20 ans et +",
};

export function categorieParAge(age: number | null, isGirl: boolean): string {
  if (age === null || age < 2) return "";
  if (age <= 4) return "Baby";
  if (age <= 7) return "U5/U7";
  if (isGirl && age <= 12) return "U12F";
  if (isGirl && age <= 15) return "U15F";
  if (age <= 9) return "U9";
  if (age <= 11) return "U11";
  if (age <= 13) return "U13";
  if (age <= 15) return "U15";
  if (age <= 17) return "U17";
  if (age <= 19) return "U19";
  return "Senior";
}

export interface PaymentHistoryEntry {
  mois_concerne: string;
  montant: number;
  moyen_paiement?: string | null;
}

export interface AbonnementSource {
  tarif_total: number;
  academy_payments_history?: PaymentHistoryEntry[] | null;
}

/**
 * Un paiement enregistré avec le moyen "OFF" marque un mois offert/suspendu,
 * il ne compte pas comme un encaissement.
 */
export function getMonthStatus(r: AbonnementSource, monthStr: string, tarifMensuel?: number): MonthStatus {
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
  /** Mensualité football par catégorie (ex : Baby, filles moins chers). Absent = tarifFoot. */
  tarifsCategorie?: Record<string, number>;
}

export interface FicheTarifable {
  football: boolean;
  centre_loisirs: boolean;
  categorie_foot: string | null;
}

/** Mensualité due par une fiche, selon sa catégorie et ses prestations. */
export function mensualiteFiche(r: FicheTarifable, t: TarifsMensuels): number {
  const prixCat = r.categorie_foot ? t.tarifsCategorie?.[r.categorie_foot] : undefined;
  const foot = prixCat && prixCat > 0 ? prixCat : t.tarifFoot;
  // Le combo garde la même remise que Foot + Loisirs au tarif standard
  const remiseCombo = Math.max(0, t.tarifFoot + t.tarifLoisirs - t.tarifCombo);
  if (r.football && r.centre_loisirs) return Math.max(0, foot + t.tarifLoisirs - remiseCombo);
  if (r.football) return foot;
  if (r.centre_loisirs) return t.tarifLoisirs;
  return 0;
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

export const DEFAULT_PLANNING: PlanningAcademy = {
  "Baby": { jours: [3, 5], heure: "", terrain: "" },
  "U5/U7": { jours: [3, 5], heure: "15h45 - 17h00", terrain: "Terrain 1" },
  "U9": { jours: [3, 5], heure: "15h45 - 17h00", terrain: "Terrain 2" },
  "U11": { jours: [3, 5], heure: "16h45 - 18h00", terrain: "Terrain 1" },
  "U12F": { jours: [3, 5], heure: "16h45 - 18h00", terrain: "Terrain 2" },
  "U13": { jours: [3, 5], heure: "17h45 - 19h00", terrain: "Terrain 1" },
  "U15": { jours: [3, 5], heure: "17h45 - 19h00", terrain: "Terrain 2" },
  "U15F": { jours: [3, 5], heure: "16h45 - 18h00", terrain: "Terrain 2" },
  "U17": { jours: [3, 5], heure: "", terrain: "" },
  "U19": { jours: [3, 5], heure: "", terrain: "" },
  "Senior": { jours: [3, 5], heure: "", terrain: "" },
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
