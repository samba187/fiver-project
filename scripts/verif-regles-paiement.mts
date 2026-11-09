// Vérificateur des règles de paiement : compare les calculs réels de l'application
// à une spécification écrite à part (les règles de l'académie, en clair), sur des milliers de fiches.
// Lancer : npm run verif:paiements   (à faire avant chaque mise en ligne qui touche aux paiements)
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "verif";
const { etatMois, getMonthStatus, statutAccueil, moisDeSaison, currentMonthStr } = await import("../lib/academy.ts");
const { statutMoisEnfant, elementsAPayer } = await import("../lib/parents.ts");

// ---------------- Spécification (indépendante du code de l'application) ----------------
type Spec = "rien" | "paye" | "partiel" | "a_payer" | "retard" | "a_venir";
const TARIFS = { tarifFoot: 1000, tarifLoisirs: 1000, tarifCombo: 1600, tarifsCategorie: { U12F: 500, U15F: 500, U5: 800 } as Record<string, number>, tarifCoran: 300, jourLimitePaiement: 10 };

function prixSpec(f: any, mois: string): number {
  const foot = TARIFS.tarifsCategorie[f.categorie_foot] || TARIFS.tarifFoot;
  let base = 0;
  if (f.football && f.centre_loisirs) base = foot + TARIFS.tarifLoisirs - (TARIFS.tarifFoot + TARIFS.tarifLoisirs - TARIFS.tarifCombo);
  else if (f.football) base = foot;
  else if (f.centre_loisirs) base = TARIFS.tarifLoisirs;
  const coran = f.coran && (!f.coran_debut || mois >= f.coran_debut) ? TARIFS.tarifCoran : 0;
  return (base + coran) || f.tarif_total;
}
function moisDe(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function spec(f: any, mois: string, auj: Date, jourLimite: number): { s: Spec; du: number; paye: number; raison: string } {
  const lignes = f.academy_payments_history.filter((h: any) => h.mois_concerne === mois);
  const paye = lignes.filter((h: any) => h.moyen_paiement !== "OFF").reduce((a: number, h: any) => a + h.montant, 0);
  const du = prixSpec(f, mois);
  const debutSaison = `${f.saison.slice(0, 4)}-10`;
  if (mois < debutSaison) return { s: "rien", du, paye, raison: "avant la saison" };
  if (f.statut_inscription === "arrete" && f.date_arret && mois >= f.date_arret.slice(0, 7)) return { s: "rien", du, paye, raison: "arrêté" };
  if (lignes.some((h: any) => h.moyen_paiement === "OFF") && paye === 0) return { s: "rien", du, paye, raison: "OFF" };
  const inscrit = moisDe(f.created_at);
  if (f.inscription_fin_de_mois && mois === inscrit) return { s: "rien", du, paye, raison: "mois offert (fin de mois)" };
  if (mois < inscrit && paye === 0) return { s: "rien", du, paye, raison: "avant l'inscription" };
  if (paye > 0 && paye >= du) return { s: "paye", du, paye, raison: "" };
  if (paye > 0) return { s: "partiel", du, paye, raison: "" };
  const actuel = moisDe(auj.toISOString());
  if (mois > actuel) return { s: "a_venir", du, paye, raison: "" };
  if (mois < actuel || auj.getDate() > jourLimite) return { s: "retard", du, paye, raison: "" };
  return { s: "a_payer", du, paye, raison: "" };
}

// ---------------- Génération de fiches au hasard ----------------
let graine = 12345;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const choix = <T,>(t: T[]): T => t[Math.floor(hasard() * t.length)];
const SAISON = "2026-2027";
const MOIS = moisDeSaison(SAISON);
const TOUS_MOIS = ["2026-08", "2026-09", ...MOIS];
const CATS = [null, "U5", "U9", "U11", "U12F", "U13", "U15F", "Autre"];

function fiche(id: number) {
  const football = hasard() < 0.8, centre_loisirs = hasard() < 0.3;
  const coran = hasard() < 0.35;
  const jour = choix([1, 3, 10, 15, 27, 28, 29, 30]);
  const moisInscr = choix(["2026-09", "2026-10", "2026-10", "2026-11", "2026-12", "2027-01", "2027-03"]);
  const created_at = new Date(`${moisInscr}-${String(jour).padStart(2, "0")}T10:00:00Z`).toISOString();
  const f: any = {
    id, nom: "T" + id, prenom: "E" + id, saison: SAISON, created_at,
    football, centre_loisirs: centre_loisirs || (!football && hasard() < 0.5),
    categorie_foot: choix(CATS), coran, coran_debut: coran ? choix([null, "2026-10", "2026-11", "2026-12", "2027-02"]) : null,
    inscription_fin_de_mois: jour >= 28 ? hasard() < 0.8 : hasard() < 0.05,
    statut_inscription: hasard() < 0.15 ? "arrete" : "actif", date_arret: null as string | null,
    tarif_total: choix([0, 500, 1000, 1300]), frais_inscription: 500, frais_inscription_paye: hasard() < 0.6,
    academy_payments_history: [] as any[], preuves: [] as any[],
  };
  if (f.statut_inscription === "arrete") f.date_arret = `${choix(MOIS.slice(0, 6))}-01`;
  if (hasard() < 0.1) { f.statut_inscription = "arrete"; f.date_arret = null; } // arrêt sans date : reste actif
  for (const m of TOUS_MOIS) {
    const r = hasard();
    if (r < 0.12) f.academy_payments_history.push({ mois_concerne: m, montant: 0, moyen_paiement: "OFF" });
    if (r > 0.45) {
      const du = prixSpec(f, m);
      const montant = choix([du, du, du, Math.floor(du / 2), 200, du + 300, 1000, 1300]);
      if (montant > 0) f.academy_payments_history.push({ mois_concerne: m, montant, moyen_paiement: choix(["Cash", "Bankily"]), date_paiement: "2026-11-01T12:00:00Z" });
      if (hasard() < 0.1) f.academy_payments_history.push({ mois_concerne: m, montant: 100, moyen_paiement: "Cash", date_paiement: "2026-11-02T12:00:00Z" });
    }
  }
  if (hasard() < 0.15) {
    const m = choix(MOIS);
    f.preuves.push({ statut: "en_attente", mois_concerne: m, details: [{ mois: m, montant: 100 }] });
  }
  return f;
}

// ---------------- Comparaison ----------------
const JOURS = ["2026-09-20", "2026-10-05", "2026-10-11", "2026-11-09", "2026-11-25", "2026-11-30", "2027-01-10", "2027-01-11", "2027-03-31", "2027-09-15"];
const VraieDate = Date;
let figee = 0;
class FausseDate extends VraieDate {
  constructor(...a: any[]) { if (a.length === 0) super(figee); else super(...(a as [any])); }
  static now() { return figee; }
}

const erreurs: Record<string, { n: number; exemple: string }> = {};
let verifs = 0;
function verifier(nom: string, cond: boolean, exemple: () => string) {
  verifs++;
  if (cond) return;
  erreurs[nom] ??= { n: 0, exemple: exemple() };
  erreurs[nom].n++;
}

const NB = 3000;
for (const jour of JOURS) {
  for (const jourLimite of [10, 5]) {
    figee = new VraieDate(jour + "T12:00:00").getTime();
    (globalThis as any).Date = FausseDate;
    const auj = new Date();
    graine = 777 + jourLimite;
    for (let i = 0; i < NB; i++) {
      const f = fiche(i);
      const tarifs = { ...TARIFS, jourLimitePaiement: jourLimite };
      const aPayer = elementsAPayer(f, tarifs);
      for (const m of TOUS_MOIS) {
        const att = spec(f, m, auj, jourLimite);
        const ctx = () => `aujourd'hui ${jour} (limite ${jourLimite}), mois ${m}, fiche ${JSON.stringify({ ...f, academy_payments_history: f.academy_payments_history.filter((h: any) => h.mois_concerne === m) })} → attendu ${att.s}${att.raison ? " (" + att.raison + ")" : ""}`;
        const enVerif = f.preuves.some((p: any) => p.statut === "en_attente" && p.details.some((d: any) => d.mois === m));

        // 1. Espace Parents / fiche joueur
        const p = statutMoisEnfant(f, m, tarifs);
        const attenduParent = att.s === "rien" ? ["avant_saison", "offert", "arrete"] : att.s === "paye" ? ["paye"] : enVerif ? ["en_verification"] : [att.s];
        verifier("Espace Parents : statut du mois", attenduParent.includes(p.statut), () => `${ctx()} — obtenu ${p.statut}`);
        if (att.s !== "rien") verifier("Espace Parents : montant du mois", p.du === att.du, () => `${ctx()} — dû ${p.du} au lieu de ${att.du}`);

        // 2. Tableau de bord : ce mois compte-t-il dans ce qui est dû ?
        const e = etatMois(f, m, { tarifs, jourLimite, aujourdhui: auj });
        verifier("Tableau de bord : mois dû ou non", e.exigible === (att.s !== "rien"), () => `${ctx()} — exigible=${e.exigible}`);
        if (e.exigible) verifier("Tableau de bord : reste à encaisser", e.reste === Math.max(0, att.du - att.paye), () => `${ctx()} — reste ${e.reste}`);

        // 3. Grille admin (couleur de la case)
        const g = getMonthStatus(f, m, att.du);
        if (att.s === "paye" && att.raison === "") verifier("Grille : case verte si payé", g === "paye", () => `${ctx()} — case ${g}`);
        if (att.s === "partiel") verifier("Grille : case orange si partiel", g === "partiel", () => `${ctx()} — case ${g}`);
        const ligneOff = f.academy_payments_history.some((h: any) => h.mois_concerne === m && h.moyen_paiement === "OFF") && att.paye === 0;
        const moisArrete = f.statut_inscription === "arrete" && f.date_arret && m >= f.date_arret.slice(0, 7);
        if (g === "off") verifier("Grille : case rouge/OFF seulement si OFF ou arrêté", ligneOff || moisArrete, () => `${ctx()} — case off`);

        // 4. Paiement (parent et dépôt staff) : mois proposés et montant
        const opt = aPayer.find(o => o.val === m);
        const doitEtreProposé = ["partiel", "a_payer", "retard", "a_venir"].includes(att.s) && !enVerif && att.du - att.paye > 0 && MOIS.includes(m);
        verifier("Paiement : mois proposé seulement s'il reste à payer", !!opt === doitEtreProposé, () => `${ctx()} — proposé=${!!opt}`);
        if (opt) verifier("Paiement : montant proposé = reste du mois", opt.reste === att.du - att.paye, () => `${ctx()} — proposé ${opt.reste}`);

        // 5. Scanner (mois en cours seulement)
        if (m === currentMonthStr(auj)) {
          const sc = statutAccueil(f, tarifs, jourLimite, auj);
          const ton = sc.enDelai ? "warn" : sc.statut === "paye" || sc.statut === "off" ? "ok" : sc.statut === "partiel" ? "warn" : "bad";
          const tonAttendu = att.s === "rien" || att.s === "paye" ? "ok" : att.s === "retard" ? "bad" : "warn";
          verifier("Scanner : entrée autorisée / avertissement / bloqué", ton === tonAttendu, () => `${ctx()} — scanner ${sc.statut}${sc.enDelai ? " (dans le délai)" : ""}`);
        }
      }
    }
    (globalThis as any).Date = VraieDate;
  }
}

console.log(`${verifs.toLocaleString("fr-FR")} vérifications sur ${NB * JOURS.length * 2} fiches × ${TOUS_MOIS.length} mois`);
const noms = Object.keys(erreurs);
if (noms.length === 0) console.log("✅ Aucun désaccord entre les écrans et les règles de l'académie");
for (const n of noms) console.log(`❌ ${n} : ${erreurs[n].n} cas\n   ex. ${erreurs[n].exemple.slice(0, 1200)}\n`);
process.exit(noms.length ? 1 : 0);
