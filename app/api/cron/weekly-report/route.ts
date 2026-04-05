import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Helper function to build premium emails
function buildEmail(title: string, paragraph: string, kpis: {label: string, value: string}[]) {
  const kpiHtml = kpis.map((k) => `
    <div style="margin-bottom: 15px; border-bottom: 1px solid #333333; padding-bottom: 15px;">
      <span style="display: block; font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">${k.label}</span>
      <span style="display: block; font-size: 20px; color: #10B981; font-weight: 700;">${k.value}</span>
    </div>
  `).join('');

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
            <td style="background-color: #3B82F6; padding: 35px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">FIVEUR ARENA</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Rapport Hebdomadaire</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 700;">${title}</h2>
              <p style="color: #cccccc; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">${paragraph}</p>
              
              <!-- Data Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #333333; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    ${kpiHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 25px 20px; text-align: center; border-top: 1px solid #222222;">
              <p style="margin: 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} Fiveur Arena.<br/>Généré automatiquement (CRON Jobs).</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(request: Request) {
  // Allow manual trigger using a cron_secret parameter, usually set in Vercel
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get week boundaries
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    const dateLimit = oneWeekAgo.toISOString();

    // 2. Fetch Reservations created in last 7 days
    const { data: resData, error: resErr } = await supabase
      .from("reservations")
      .select("*")
      .gte("created_at", dateLimit)
      .neq("status", "cancelled")
      .neq("status", "deleted");

    // 3. Fetch Academy & Loisirs
    const { data: acadData } = await supabase.from("academy_players").select("*").gte("created_at", dateLimit);
    const { data: loisirsData } = await supabase.from("loisirs_children").select("*").gte("created_at", dateLimit);

    const safeResData = resData || [];
    const safeAcadData = acadData || [];
    const safeLoisirsData = loisirsData || [];

    // Calculate metrics
    let totalRevenue = 0;
    let paidRevenue = 0;
    
    safeResData.forEach((r) => {
      totalRevenue += (r.total_price || 0);
      paidRevenue += (r.amount_paid || 0);
    });

    const kpis = [
      { label: "Nouvelles Réservations (Non annulées)", value: safeResData.length.toString() },
      { label: "Chiffre d'Affaires Généré", value: `${totalRevenue.toLocaleString("fr-FR")} MRU` },
      { label: "Total encaissé", value: `${paidRevenue.toLocaleString("fr-FR")} MRU` },
      { label: "Nouveaux Inscrits (Academy + Loisirs)", value: (safeAcadData.length + safeLoisirsData.length).toString() },
    ];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'contact.fiveur@gmail.com',
        pass: 'wmkt tput cpfy dtpd',
      },
    });

    const html = buildEmail(
      "Rapport d'Activité de la Semaine",
      `Voici un résumé de l'activité sur la plateforme Fiver Arena pour les 7 derniers jours (depuis le ${oneWeekAgo.toLocaleDateString("fr-FR")}).`,
      kpis
    );

    await transporter.sendMail({
      from: '"Fiver Arena" <contact.fiveur@gmail.com>',
      to: 'contact.fiveur@gmail.com', // Sent to Admin
      subject: '📊 Rapport Hebdomadaire Fiver Arena',
      html: html,
    });

    return NextResponse.json({ success: true, count: safeResData.length });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ success: false, error: 'Failed to complete cron job' }, { status: 500 });
  }
}
