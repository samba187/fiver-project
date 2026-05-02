"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Settings, ClipboardList, BarChart3, MessageCircle, Receipt, PartyPopper, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { TabParametres } from "./tab-parametres";
import { TabInscriptions } from "./tab-inscriptions";
import { TabDashboard } from "./tab-dashboard";
import { TabRappels } from "./tab-rappels";
import { TabRecus } from "./tab-recus";

export interface Registration {
  id: number;
  nom: string;
  prenom: string;
  nom_pere: string | null;
  date_naissance: string | null;
  sexe: string;
  telephone_parent: string | null;
  adresse: string | null;
  football: boolean;
  centre_loisirs: boolean;
  categorie_foot: string | null;
  tarif_football: number;
  tarif_loisirs: number;
  tarif_total: number;
  montant_paye: number;
  statut_paiement: string;
  date_paiement: string | null;
  date_limite_paiement: string | null;
  observations: string | null;
  created_at: string;
  photo_url: string | null;
  moyen_paiement: string | null;
  frais_inscription: number;
  frais_inscription_paye: boolean;
  inscription_fin_de_mois: boolean;
  academy_payments_history?: any[];
}

export interface Tarifs {
  tarifFoot: number;
  tarifLoisirs: number;
  tarifCombo: number;
  fraisInscription: number;
  jourLimitePaiement: number;
  seuilFinDeMois: number;
}

const DEFAULT_TARIFS: Tarifs = {
  tarifFoot: 10000,
  tarifLoisirs: 10000,
  tarifCombo: 16000,
  fraisInscription: 1000,
  jourLimitePaiement: 10,
  seuilFinDeMois: 25,
};

const TABS = [
  { id: "parametres", label: "Paramètres", icon: Settings },
  { id: "inscriptions", label: "Inscriptions", icon: ClipboardList },
  { id: "dashboard", label: "Tableau de Bord", icon: BarChart3 },
  { id: "rappels", label: "Rappels", icon: MessageCircle },
  { id: "recus", label: "Reçus", icon: Receipt },
];

export default function AcademyProPage() {
  const [tab, setTab] = useState("inscriptions");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tarifs, setTarifs] = useState<Tarifs>(DEFAULT_TARIFS);
  const [loading, setLoading] = useState(true);
  const [showBirthdayObj, setShowBirthdayObj] = useState<{show: boolean, names: string[]}>({ show: false, names: [] });



  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tarifs
      const { data: tarifData } = await supabase.from("settings").select("key, value").eq("key", "academy_tarifs").single();
      if (tarifData?.value) { try { setTarifs({ ...DEFAULT_TARIFS, ...JSON.parse(tarifData.value) }); } catch {} }

      // Fetch registrations with history
      const { data: regData } = await supabase.from("academy_registrations").select("*, academy_payments_history(*)").order("nom", { ascending: true });
      setRegistrations(regData ? (regData as Registration[]) : []);
    } catch (e) {
      console.error(e);
      setRegistrations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (registrations.length === 0) return;
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `-${mm}-${dd}`;
    const bdays = registrations.filter(r => r.date_naissance && r.date_naissance.endsWith(todayStr));
    if (bdays.length > 0) setShowBirthdayObj({ show: true, names: bdays.map(r => `${r.prenom} ${r.nom}`) });
  }, [registrations]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col">
      {showBirthdayObj.show && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-gradient-to-r from-fiver-green/20 to-transparent p-4 border border-fiver-green/20 relative overflow-hidden">
          <PartyPopper className="absolute right-4 text-fiver-green/10 h-24 w-24 -translate-y-4 rotate-12" />
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/5">
              <Image src="/images/fiveur-academy-logo.png" alt="Logo Academy" fill className="object-cover p-1" />
            </div>
            <div>
              <p className="font-[var(--font-heading)] text-sm font-bold uppercase text-white">Joyeux Anniversaire ! 🎉</p>
              <p className="text-xs text-white/60">{showBirthdayObj.names.join(", ")}</p>
            </div>
          </div>
          <button onClick={() => setShowBirthdayObj({ ...showBirthdayObj, show: false })} className="text-white/40 hover:text-white z-10"><XIcon className="h-5 w-5" /></button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <Image src="/images/fiveur-academy-logo.png" alt="Fiveur Academy" width={48} height={48} className="h-10 w-auto rounded-full border border-white/10" />
        <div>
          <h1 className="font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Academy Pro</h1>
          <p className="mt-0.5 text-xs text-white/40">Espace de gestion de l'Academy et du Centre de Loisirs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              tab === t.id ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>
            <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "parametres" && <TabParametres tarifs={tarifs} setTarifs={setTarifs} />}
      {tab === "inscriptions" && <TabInscriptions registrations={registrations} tarifs={tarifs} onRefresh={fetchData} />}
      {tab === "dashboard" && <TabDashboard registrations={registrations} tarifs={tarifs} />}
      {tab === "rappels" && <TabRappels registrations={registrations} tarifs={tarifs} />}
      {tab === "recus" && <TabRecus registrations={registrations} />}
    </div>
  );
}
