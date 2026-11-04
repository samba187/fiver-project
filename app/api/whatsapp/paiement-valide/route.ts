import { NextResponse } from "next/server";
import { clientStaff } from "@/lib/serveur-staff";
import { notifierFamille } from "@/lib/push-serveur";

// Confirmation au parent quand l'académie valide un paiement déposé :
// notification sur son téléphone (s'il l'a activée) + message WhatsApp.
// - Clés WhatsApp Business (Meta) + modèle approuvé configurés : envoi automatique.
// - Sinon : renvoie le message et le numéro, l'admin l'envoie en un clic (lien wa.me).
// Réservé au personnel connecté : le message est construit à partir de la base, jamais du navigateur.

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function libelle(mois: string) {
  if (mois === "FRAIS") return "Frais d'inscription";
  const [a, m] = mois.split("-");
  const nom = MOIS[parseInt(m, 10) - 1];
  return nom ? `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${a}` : mois;
}

/** Numéro au format international sans "+", ex : 22236123456 (numéros mauritaniens à 8 chiffres). */
function numeroWhatsApp(tel: string | null) {
  const chiffres = (tel || "").replace(/\D/g, "").replace(/^00/, "");
  if (chiffres.length === 8) return `222${chiffres}`;
  return chiffres;
}

export async function POST(req: Request) {
  try {
    const { preuveId, origin } = await req.json().catch(() => ({}));
    if (!req.headers.get("authorization") || !preuveId) return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
    const staff = await clientStaff(req);
    if (!staff) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
    const { supabase } = staff;

    const { data: p } = await supabase
      .from("academy_preuves_paiement")
      .select("id, registration_id, mois_concerne, montant, moyen_paiement, details, statut")
      .eq("id", preuveId)
      .maybeSingle();
    if (!p || p.statut !== "valide") return NextResponse.json({ erreur: "Paiement introuvable ou non validé" }, { status: 404 });

    const { data: r } = await supabase
      .from("academy_registrations")
      .select("prenom, nom, telephone_parent")
      .eq("id", p.registration_id)
      .maybeSingle();
    if (!r) return NextResponse.json({ erreur: "Enfant introuvable" }, { status: 404 });

    const lignes: { mois: string; montant: number }[] = Array.isArray(p.details) && p.details.length > 0
      ? p.details
      : [{ mois: p.mois_concerne, montant: p.montant }];
    const enfant = `${r.prenom} ${r.nom}`;
    const objet = lignes.map(l => libelle(l.mois)).join(" + ");
    const montant = `${Number(p.montant).toLocaleString("fr-FR").replace(/ | /g, " ")} MRU`;
    const site = typeof origin === "string" && /^https?:\/\//.test(origin) ? origin : "";

    const message = [
      "✅ *Fiveur Academy — Paiement reçu*",
      "",
      `Bonjour, nous confirmons la bonne réception du paiement de *${enfant}* :`,
      `• ${objet}`,
      `• Montant : ${montant}${p.moyen_paiement ? ` (${p.moyen_paiement})` : ""}`,
      "",
      site ? `Votre reçu est disponible dans l'Espace Parents : ${site}/espace-parents` : "Votre reçu est disponible dans l'Espace Parents.",
      "",
      "Merci et à bientôt sur le terrain ⚽",
    ].join("\n");
    const telephone = numeroWhatsApp(r.telephone_parent);

    // Notification sur le téléphone du parent (si activée dans son Espace Parents)
    const push = await notifierFamille(supabase, r.telephone_parent, {
      title: "✅ Paiement validé",
      body: `${r.prenom} : ${objet} — ${montant}. Votre reçu est disponible.`,
    }).catch(() => 0);

    // Envoi automatique : WhatsApp Business (Meta) avec un modèle approuvé
    // (corps du modèle avec 3 variables : {{1}} enfant, {{2}} objet, {{3}} montant).
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const MODELE = process.env.WHATSAPP_TEMPLATE_PAIEMENT;
    if (PHONE_ID && TOKEN && MODELE && telephone) {
      const res = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telephone,
          type: "template",
          template: {
            name: MODELE,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUE || "fr" },
            components: [{ type: "body", parameters: [enfant, objet, montant].map(text => ({ type: "text", text })) }],
          },
        }),
      });
      if (res.ok) return NextResponse.json({ envoye: true, push, telephone, message });
      console.error("WhatsApp paiement validé :", await res.text());
    }

    return NextResponse.json({ envoye: false, push, telephone, message });
  } catch (e) {
    console.error("WhatsApp paiement validé :", e);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
