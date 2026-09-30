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
