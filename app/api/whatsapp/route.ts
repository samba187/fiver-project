import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, amount, pitch, date, time, name } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: "Number is required" }, { status: 400 });
    }

    // WhatsApp expects standard formats without '+' for Meta API
    // Example: 22240123456
    const formattedPhone = phone.replace("+", "").replace(/\s/g, "");
    const finalPhone = formattedPhone.startsWith("222") ? formattedPhone : `222${formattedPhone}`;

    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    const TOKEN = process.env.WHATSAPP_TOKEN;

    if (!PHONE_ID || !TOKEN) {
      console.log(`[WhatsApp Simulation] Envoi à ${finalPhone} : "Bonjour ${name}, merci d'avoir réservé ${pitch} le ${date} à ${time}. Veuillez payer ${amount} MRU pour confirmer."`);
      console.log("-> Aucune clé API configurée. Veuillez ajouter WHATSAPP_PHONE_ID et WHATSAPP_TOKEN dans .env.local.");
      return NextResponse.json({ success: true, message: "Mode simulation. Clés manquantes." });
    }

    // Appel à l'API Officielle Meta Cloud WhatsApp
    const url = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;
    
    // NOTA: Hors fenêtre de 24h, vous devez utiliser "type: 'template'". 
    // Pour les tests ou conversations actives, un texte simple fonctionne.
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalPhone,
      type: "text",
      text: { 
        preview_url: false,
        body: `*NOUVELLE RÉSERVATION - FIVEUR ARENA*\n\nBonjour ${name} ! Merci d'avoir réservé.\n\n⚽ *Lieu:* ${pitch}\n📅 *Date:* ${date}\n🕒 *Heure:* ${time}\n\n⚠️ *IMPORTANT :* Pour valider votre créneau, veuillez envoyer la totalité de la somme (*${amount} MRU*) via *Bankily* ou *Masrvi* au numéro 48 81 38 22.\n\nRépondez à ce message avec la capture de votre reçu sous 2h. Sans paiement, le système annulera le créneau.`
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur API WhatsApp:", data);
      return NextResponse.json({ success: false, error: data }, { status: 500 });
    }

    console.log(`[WhatsApp Success] Message envoyé à ${finalPhone}`);
    return NextResponse.json({ success: true, message: "WhatsApp message envoyé" });
  } catch (error) {
    console.error("Erreur serveur WhatsApp:", error);
    return NextResponse.json({ success: false, error: "Failed to send WhatsApp message" }, { status: 500 });
  }
}
