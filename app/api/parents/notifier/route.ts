import { NextResponse } from "next/server";
import { clientStaff } from "@/lib/serveur-staff";
import { notifierFamille, notifierParents } from "@/lib/push-serveur";

// Notification sur le téléphone du parent : paiement refusé, ou nouveau message de l'académie.
// Réservé au personnel connecté ; le texte est construit à partir de la base.

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const libelle = (m: string) => m === "FRAIS" ? "Frais d'inscription" : (() => { const [a, mm] = m.split("-"); const n = MOIS[parseInt(mm, 10) - 1]; return n ? `${n.charAt(0).toUpperCase()}${n.slice(1)} ${a}` : m; })();

export async function POST(req: Request) {
  try {
    const staff = await clientStaff(req);
    if (!staff) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
    const { supabase } = staff;
    const { type, preuveId, parentId } = await req.json().catch(() => ({}));

    if (type === "refus" && preuveId) {
      const { data: p } = await supabase.from("academy_preuves_paiement")
        .select("registration_id, mois_concerne, details, statut, motif_refus").eq("id", preuveId).maybeSingle();
      if (!p || p.statut !== "refuse") return NextResponse.json({ erreur: "Paiement introuvable" }, { status: 404 });
      const { data: r } = await supabase.from("academy_registrations").select("prenom, telephone_parent").eq("id", p.registration_id).maybeSingle();
      if (!r) return NextResponse.json({ erreur: "Enfant introuvable" }, { status: 404 });
      const mois = (Array.isArray(p.details) && p.details.length ? p.details.map((d: { mois: string }) => d.mois) : [p.mois_concerne]).map(libelle).join(" + ");
      const push = await notifierFamille(supabase, r.telephone_parent, {
        title: "❌ Paiement refusé",
        body: `${r.prenom} : ${mois}.${p.motif_refus ? ` Motif : ${String(p.motif_refus).slice(0, 120)}` : ""}`,
      });
      return NextResponse.json({ push });
    }

    if (type === "message" && parentId) {
      const { data: m } = await supabase.from("parent_messages").select("contenu").eq("parent_id", parentId).eq("sens", "academie")
        .order("created_at", { ascending: false }).limit(1);
      const contenu = String(m?.[0]?.contenu || "");
      const push = await notifierParents(supabase, [parentId], {
        title: "💬 Message de Fiveur Academy",
        body: contenu.length > 140 ? contenu.slice(0, 137) + "…" : contenu,
      });
      return NextResponse.json({ push });
    }

    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  } catch (e) {
    console.error("Notification parent :", e);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
