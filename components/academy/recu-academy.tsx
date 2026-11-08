/* eslint-disable @next/next/no-img-element */
// Reçu de paiement Fiveur Academy : le même document côté admin (fiche inscrit)
// et côté Espace Parents.

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export interface LigneRecu {
  id: string;
  label: string;
  amount: number;
  method: string;
  date: string;
}

export interface JoueurRecu {
  id: number;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  telephone_parent?: string | null;
  football?: boolean | null;
  centre_loisirs?: boolean | null;
  categorie_foot?: string | null;
  photo_url?: string | null;
  coran?: boolean | null;
  coran_debut?: string | null;
}

interface FicheRecu {
  frais_inscription_paye?: boolean | null;
  frais_inscription?: number | null;
  created_at?: string | null;
  academy_payments_history?: { mois_concerne: string; montant: number; moyen_paiement?: string | null; date_paiement?: string | null }[] | null;
}

export function libelleLigneMois(monthStr: string) {
  const [y, m] = monthStr.split("-");
  return `Mois : ${MOIS_COURTS[parseInt(m, 10) - 1] || m} ${y}`;
}

/** Lignes facturables d'une fiche : frais d'inscription payés + un total par mois payé. */
export function lignesRecu(r: FicheRecu): LigneRecu[] {
  const history = (r.academy_payments_history || []).filter(h => h.moyen_paiement !== "OFF");
  const items: LigneRecu[] = [];

  if (r.frais_inscription_paye) {
    const fraisP = history.find(h => h.mois_concerne === "FRAIS");
    items.push({
      id: "FRAIS",
      label: "Frais d'inscription",
      amount: r.frais_inscription || 0,
      method: fraisP?.moyen_paiement || "Cash",
      date: fraisP?.date_paiement || String(r.created_at),
    });
  }

  const monthMap = new Map<string, { amount: number; method: string; date: string }>();
  history.forEach(h => {
    if (h.mois_concerne === "FRAIS") return;
    const existing = monthMap.get(h.mois_concerne);
    const date = h.date_paiement || "";
    if (existing) {
      existing.amount += h.montant;
      if (new Date(date) > new Date(existing.date)) {
        existing.method = h.moyen_paiement || "Cash";
        existing.date = date;
      }
    } else {
      monthMap.set(h.mois_concerne, { amount: h.montant, method: h.moyen_paiement || "Cash", date });
    }
  });
  monthMap.forEach((data, monthStr) => {
    items.push({ id: monthStr, label: libelleLigneMois(monthStr), amount: data.amount, method: data.method, date: data.date });
  });

  return items.sort((a, b) => a.id.localeCompare(b.id));
}

function formatDateSafely(dateStr: string | null | undefined) {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return "Date inconnue";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "Date inconnue" : d.toLocaleDateString("fr-FR");
}

export function RecuAcademy({ joueur, lignes }: { joueur: JoueurRecu; lignes: LigneRecu[] }) {
  const totalAmount = lignes.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ width: "100%", maxWidth: "600px", background: "white", padding: "40px", color: "#1a1a1a", position: "relative", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.05, pointerEvents: "none", zIndex: 0 }}>
        <img src="/images/fiveur-academy-logo.png" alt="Watermark" style={{ width: 320, height: "auto" }} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 24, position: "relative", zIndex: 10 }}>
        <img src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" style={{ height: 60, display: "inline-block" }} />
      </div>

      <div style={{ marginBottom: 24, position: "relative", zIndex: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#2d6a2e", textTransform: "uppercase", margin: 0 }}>FIVEUR ACADEMY</h1>
        <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0 0" }}>Since 2026 — Nouakchott, Mauritanie</p>
      </div>

      <div style={{ marginBottom: 20, position: "relative", zIndex: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px 0", color: "#111" }}>REÇU DE PAIEMENT</h2>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span><strong>Reçu N° :</strong> REC-{String(joueur.id).padStart(4, "0")}</span>
          <span><strong>Date :</strong> {formatDateSafely(new Date().toISOString())}</span>
        </div>
      </div>

      <div style={{ background: "#2d6a2e", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>INFORMATIONS DE L&apos;INSCRIT</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginBottom: 32 }}>
        <div style={{ flex: 1, paddingRight: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
            <span style={{ color: "#666" }}>Nom et Prénom :</span>
            <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{joueur.prenom} {joueur.nom}</span>
          </div>
          {joueur.date_naissance && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Date de naissance :</span>
              <span style={{ fontWeight: 700 }}>{formatDateSafely(joueur.date_naissance)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
            <span style={{ color: "#666" }}>Tél. parent :</span>
            <span style={{ fontWeight: 700 }}>{joueur.telephone_parent}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderBottom: "1px solid #eee" }}>
            <span style={{ color: "#666" }}>Prestation(s) :</span>
            <span style={{ fontWeight: 700 }}>
              {[
                joueur.football && `⚽ Football Academy${joueur.categorie_foot ? ` (${joueur.categorie_foot})` : ""}`,
                joueur.centre_loisirs && "🎨 Centre Loisirs",
                joueur.coran && `📖 Coran${joueur.coran_debut ? ` (dès ${libelleLigneMois(joueur.coran_debut).replace("Mois : ", "")})` : ""}`,
              ].filter(Boolean).join(" + ")}
            </span>
          </div>
        </div>
        <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "2px solid #2d6a2e", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", flexShrink: 0 }}>
          {joueur.photo_url ? (
            <img src={joueur.photo_url} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <span style={{ color: "#999", fontSize: 24, fontWeight: "bold" }}>{joueur.prenom.charAt(0)}</span>
          )}
        </div>
      </div>

      <div style={{ background: "#2d6a2e", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, position: "relative", zIndex: 10 }}>DÉTAIL DES PAIEMENTS</div>

      <div style={{ position: "relative", zIndex: 10, marginBottom: 24 }}>
        {lignes.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "#333", fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{item.method.toUpperCase()}</span>
                <span>•</span>
                <span>Réglé le {item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "N/A"}</span>
              </div>
            </div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{item.amount} MRU</span>
          </div>
        ))}
      </div>

      <div style={{ background: "#f0fdf0", border: "1px solid #2d6a2e", padding: "24px 20px", textAlign: "center", margin: "32px 0 16px 0", borderRadius: 8, position: "relative", zIndex: 10 }}>
        <p style={{ fontSize: 13, color: "#666", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, margin: "0 0 8px 0" }}>MONTANT TOTAL PAYÉ</p>
        <p style={{ fontSize: 36, fontWeight: 900, color: "#2d6a2e", margin: 0 }}>{totalAmount} MRU</p>
        <div style={{ marginTop: 16 }}>
          <span style={{ display: "inline-block", padding: "6px 20px", borderRadius: 20, fontWeight: 800, fontSize: 14, background: "#dcfce7", color: "#166534" }}>
            ✅ Paiement Confirmé
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40, fontSize: 10, color: "#999", borderTop: "1px solid #eee", paddingTop: 16, position: "relative", zIndex: 10 }}>
        Ce document est généré de manière automatique et électronique, il tient lieu de preuve de paiement certifiée.<br />
        <strong>Fiveur Academy</strong>
      </div>
    </div>
  );
}

/** Transforme le reçu affiché (élément de 600 px de large) en PDF A4. */
export async function recuEnPdf(element: HTMLElement) {
  const [htmlToImage, { default: jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const imgData = await htmlToImage.toPng(element, { pixelRatio: 2, skipAutoScale: true });
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
  let imgWidthRender = pdfWidth;

  if (imgHeight > pdfPageHeight) {
    const ratio = pdfPageHeight / imgHeight;
    imgHeight = pdfPageHeight;
    imgWidthRender = imgWidthRender * ratio;
  }

  const xOffset = (pdfWidth - imgWidthRender) / 2;
  pdf.addImage(imgData, "PNG", xOffset, 0, imgWidthRender, imgHeight);
  return pdf;
}
