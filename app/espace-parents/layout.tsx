import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace Parents — Fiveur Academy",
  description: "Paiements, factures, entraînements, photos et suivi sportif de votre enfant.",
  // Installable sur l'écran d'accueil (indispensable pour les notifications sur iPhone)
  manifest: "/manifest-parents.webmanifest",
  appleWebApp: { capable: true, title: "Fiveur Parents", statusBarStyle: "black-translucent" },
  icons: { apple: "/images/parents-icon-192.png" },
};

export default function EspaceParentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
