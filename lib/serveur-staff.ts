import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur avec le jeton du membre du staff qui appelle la route.
 * Renvoie null si le jeton est absent ou invalide : la route doit alors refuser.
 */
export async function clientStaff(req: Request): Promise<{ supabase: SupabaseClient; email: string } | null> {
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jeton) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { persistSession: false },
  });
  const { data } = await supabase.auth.getUser(jeton);
  if (!data.user) return null;
  return { supabase, email: data.user.email || "" };
}
