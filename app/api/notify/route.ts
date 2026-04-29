import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function buildEmail(title: string, dataObj: Record<string, string>, actionLink: string, actionText: string) {
  const rowsHtml = Object.entries(dataObj).map(([label, value], index, arr) => {
    const isLast = index === arr.length - 1;
    const borderInfo = isLast ? '' : 'border-bottom: 1px solid #333333; margin-bottom: 15px; padding-bottom: 15px;';
    return `
      <div style="${borderInfo}">
        <span style="display: block; font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">${label}</span>
        <span style="display: block; font-size: 16px; color: #ffffff; font-weight: 500;">${value}</span>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #333333; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="background-color: #10B981; padding: 35px 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 26px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1;">FIVEUR ARENA</h1>
              <p style="margin: 8px 0 0 0; color: rgba(0,0,0,0.65); font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Alerte Notification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 30px 0; color: #ffffff; font-size: 22px; font-weight: 700;">${title}</h2>
              
              <!-- Data Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #333333; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    ${rowsHtml}
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td align="center">
                    <a href="${actionLink}" style="display: inline-block; background-color: #10B981; color: #000000; font-weight: 700; font-size: 14px; text-decoration: none; padding: 16px 36px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">${actionText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 25px 20px; text-align: center; border-top: 1px solid #222222;">
              <p style="margin: 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} Fiveur Arena.<br/>Cet e-mail a été envoyé automatiquement par le système de réservation.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { type, data, origin } = await request.json();
    const siteUrl = origin || 'http://localhost:3000';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'contact.fiveur@gmail.com',
        pass: 'mzwq aifm wxvl yzqm',
      },
    });

    let subject = '';
    let html = '';

    if (type === 'reservation') {
      subject = '🎉 Nouvelle Réservation : ' + data.name;
      html = buildEmail(
        'Nouvelle Réservation Enregistrée !',
        {
          "Client": data.name || '',
          "Téléphone": data.phone || '',
          "Terrain": data.pitch || '',
          "Créneau": `${data.date} à ${data.time}`,
          "Tarif": `${data.amount} MRU`
        },
        `${siteUrl}/staff/reservations`,
        "Ouvrir les Réservations"
      );
    } else if (type === 'contact') {
      subject = '📩 Nouveau Message de ' + data.name;
      html = buildEmail(
        'Nouveau Message de Contact',
        {
          "Expéditeur": data.name || '',
          "Téléphone": data.phone || '',
          "Sujet": data.subject || '',
          "Message": data.message || ''
        },
        `${siteUrl}/staff`,
        "Ouvrir le Tableau de Bord"
      );
    } else if (type === 'academy') {
      subject = '⚽ Inscription Academy : ' + data.playerName;
      html = buildEmail(
        'Demande Inscription Academy',
        {
          "Joueur": data.playerName || '',
          "Catégorie": data.playerCategory || '',
          "Parent": `${data.name} (${data.phone})`,
          "Statut": "En attente"
        },
        `${siteUrl}/staff/academy`,
        "Gérer l'Académie"
      );
    } else if (type === 'loisirs') {
      subject = '🎈 Inscription Loisirs : ' + data.playerName;
      html = buildEmail(
        'Demande Inscription Loisirs',
        {
          "Enfant": data.playerName || '',
          "Catégorie": data.playerCategory || '',
          "Parent": `${data.name} (${data.phone})`,
          "Statut": "En attente"
        },
        `${siteUrl}/staff/loisirs`,
        "Gérer les Loisirs"
      );
    } else if (type === 'sport_feminin') {
      subject = '💖 Inscription Sport Féminin : ' + data.prenom + ' ' + data.nom;
      html = buildEmail(
        'Nouvelle Inscription Sport Féminin',
        {
          "Inscrite": `${data.prenom} ${data.nom}`,
          "Date Naissance": data.dateNaissance || '',
          "Téléphone": data.telephone || '',
          "Enfant inscrit": data.enfantInscrit ? `Oui (-20%) : ${data.enfantNomPrenom}` : 'Non',
          "Tarif": data.tarif || ''
        },
        `${siteUrl}/staff/sport-feminin`,
        "Gérer les inscriptions"
      );
    }

    await transporter.sendMail({
      from: '"Fiver Arena" <contact.fiveur@gmail.com>',
      to: 'contact.fiveur@gmail.com', // Admin receives it
      subject: subject,
      html: html,
    });

    if (data.email) {
      let clientSubject = 'Fiver Arena - Demande enregistrée';
      let clientHtml = '';
      
      if (type === 'reservation') {
        clientSubject = 'Fiver Arena - Réservation en cours de traitement';
        clientHtml = buildEmail(
          'Demande de Réservation Reçue !',
          {
            "Terrain": data.pitch || '',
            "Créneau": `${data.date} à ${data.time}`,
            "Tarif à payer": `${data.amount} MRU`,
            "Statut": "En attente de reçu Bankily"
          },
          "https://wa.me/22248813822",
          "Envoyer mon reçu sur WhatsApp"
        );
      } else {
        clientHtml = buildEmail(
          'Demande bien reçue !',
          { "Status": "Notre équipe traitera votre demande dans les plus brefs délais." },
           siteUrl,
          "Retourner sur le site"
        );
      }

      await transporter.sendMail({
        from: '"Fiver Arena" <contact.fiveur@gmail.com>',
        to: data.email, // Client receives it
        subject: clientSubject,
        html: clientHtml,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
