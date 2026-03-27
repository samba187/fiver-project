import { NextRequest, NextResponse } from "next/server";

const KALBE_API_KEY = process.env.KALBE_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { success: false, errorMessage: "Reference manquante." },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://sandbox.kalbe.io/api/payment/status/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${KALBE_API_KEY}`,
        },
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, errorMessage: "Erreur lors de la vérification du statut." },
      { status: 500 }
    );
  }
}
