import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace Parents — Fiveur Academy",
  description: "Paiements, factures, entraînements, photos et suivi sportif de votre enfant.",
};

export default function EspaceParentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
