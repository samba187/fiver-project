import { NextRequest, NextResponse } from "next/server";

const KALBE_API_URL = "https://sandbox.kalbe.io/api/payment/init";
const KALBE_API_KEY = process.env.KALBE_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, amount, phone } = body;

    const res = await fetch(KALBE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KALBE_API_KEY}`,
      },
      body: JSON.stringify({ reference, amount, phone }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, errorMessage: "Erreur serveur lors du paiement Masrvi." },
      { status: 500 }
    );
  }
}
