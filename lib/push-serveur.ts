import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Notifications sur le téléphone des parents (Web Push).
// Clés à mettre dans Vercel : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (et VAPID_SUBJECT facultatif).

export interface MessagePush { title: string; body: string; url?: string }

function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact.fiveur@gmail.com", pub, priv);
  return true;
}

const tel8 = (t: string | null | undefined) => (t || "").replace(/\D/g, "").slice(-8);

/** Envoie la notification à tous les téléphones abonnés de la famille (retrouvée par son numéro). */
export async function notifierFamille(supabase: SupabaseClient, telephoneParent: string | null, message: MessagePush): Promise<number> {
  if (!configure()) return 0;
  const tel = tel8(telephoneParent);
  if (tel.length !== 8) return 0;
  const { data: comptes } = await supabase.from("parent_comptes").select("id").eq("telephone", tel).eq("actif", true);
  const ids = (comptes || []).map(c => c.id as string);
  return ids.length ? notifierParents(supabase, ids, message) : 0;
}

export async function notifierParents(supabase: SupabaseClient, parentIds: string[], message: MessagePush): Promise<number> {
  if (!configure() || parentIds.length === 0) return 0;
  const { data: abonnements } = await supabase.from("parent_push").select("id, abonnement").in("parent_id", parentIds);
  let envoyes = 0;
  await Promise.all((abonnements || []).map(async a => {
    try {
      await webpush.sendNotification(a.abonnement as webpush.PushSubscription, JSON.stringify({ url: "/espace-parents", ...message }), { TTL: 60 * 60 * 24 * 3 });
      envoyes++;
    } catch (e) {
      // Téléphone désabonné ou navigateur réinstallé : on oublie cet abonnement
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("parent_push").delete().eq("id", a.id);
      else console.error("Notification parent :", e);
    }
  }));
  return envoyes;
}
