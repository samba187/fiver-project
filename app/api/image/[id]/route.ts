import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Photos de profil envoyées depuis l'Espace Parents (stockées en base, voir image_publique)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.rpc("image_publique", { p_id: id });
  const m = typeof data === "string" ? data.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/) : null;
  if (error || !m) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      // Une image n'est jamais modifiée : une nouvelle photo = un nouvel identifiant
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
