import { NextRequest, NextResponse } from "next/server";

const KALBE_API_URL = "https://sandbox.kalbe.io/api/payment/bankily";
const KALBE_API_KEY = process.env.KALBE_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, phone, amount, validation_code } = body;

    if (!reference || !phone || !amount || !validation_code) {
      return NextResponse.json(
        { success: false, errorMessage: "Champs requis manquants." },
        { status: 400 }
      );
    }

    const res = await fetch(KALBE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KALBE_API_KEY}`,
      },
      body: JSON.stringify({ reference, phone, amount, validation_code }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, errorMessage: "Erreur serveur lors du paiement Bankily." },
      { status: 500 }
    );
  }
}
