"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, Calendar, Bus, Settings, Check, X, Eye, FileText, Download, MessageCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface TransportParent {
  id: number;
  telephone: string;
  nom: string;
  prenom: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
  instructions_chauffeur: string;
  photo_maison_url: string;
  statut: string;
  enfant_nom_prenom: string;
  registration_id: number | null;
  created_at: string;
}

interface TransportBooking {
  id: number;
  parent_id: number;
  date_seance: string;
  type_trajet: string;
  montant: number;
  statut: string;
  parent: TransportParent;
}

export default function AdminTransportPage() {
  const [activeTab, setActiveTab] = useState<"parents" | "bookings" | "driver" | "settings">("parents");
  const [loading, setLoading] = useState(true);

  // Data
  const [parents, setParents] = useState<TransportParent[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  
  // Settings
  const [joursActifs, setJoursActifs] = useState<string[]>([]);
  const [tarifs, setTarifs] = useState({ aller: 60, retour: 60, aller_retour: 120 });
  const [driverPhone, setDriverPhone] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [isGeneratingWA, setIsGeneratingWA] = useState(false);

  // Date filter for bookings & driver sheet
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "parents") {
        const { data } = await supabase.from("transport_parents").select("*").order("created_at", { ascending: false });
        if (data) setParents(data);
      } 
      else if (activeTab === "bookings") {
        const { data } = await supabase.from("transport_bookings")
          .select("*, parent:parent_id(*)")
          .order("date_seance", { ascending: false });
        if (data) setBookings(data as any);
      }
      else if (activeTab === "driver") {
        const { data } = await supabase.from("transport_bookings")
          .select("*, parent:parent_id(*)")
          .eq("date_seance", selectedDate)
          .eq("statut", "confirme")
          .order("created_at", { ascending: false });
        if (data) setBookings(data as any);
      }
      else if (activeTab === "settings") {
        const { data } = await supabase.from("settings").select("*").in("key", ["transport_jours", "transport_tarifs", "transport_driver_phone"]);
        data?.forEach(s => {
          if (s.key === "transport_jours") setJoursActifs(JSON.parse(s.value));
          if (s.key === "transport_tarifs") setTarifs(JSON.parse(s.value));
          if (s.key === "transport_driver_phone") setDriverPhone(s.value);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS PARENTS ---

  async function updateParentStatus(id: number, statut: "valide" | "bloque") {
    if (!confirm(`Voulez-vous vraiment passer ce compte en "${statut}" ?`)) return;
    await supabase.from("transport_parents").update({ statut }).eq("id", id);
    fetchData();
  }

  async function validerBooking(id: number) {
    if (!confirm("Valider cette réservation ?")) return;
    await supabase.from("transport_bookings").update({ statut: "confirme" }).eq("id", id);
    fetchData();
  }

  async function shortenUrl(url: string) {
    if (!url) return "";
    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      if (res.ok) return await res.text();
    } catch (e) {
      console.error(e);
    }
    return url;
  }

  async function generateWhatsAppDriver() {
    setIsGeneratingWA(true);
    try {
      const aller = bookings.filter(b => b.type_trajet === "aller" || b.type_trajet === "aller_retour");
      const retour = bookings.filter(b => b.type_trajet === "retour" || b.type_trajet === "aller_retour");
      
      let text = `*Fiche Navette du ${new Date(selectedDate).toLocaleDateString("fr-FR")}*\n\n`;
      
      text += `*--- ALLER (Domicile -> Stade) ---*\n`;
      if (aller.length === 0) text += `Aucun trajet\n`;
      for (let i = 0; i < aller.length; i++) {
        const b = aller[i];
        text += `${i+1}. *${b.enfant_nom || b.parent?.enfant_nom_prenom}*\n`;
        text += `- Adresse: ${b.parent?.adresse}\n`;
        if (b.parent?.latitude && b.parent?.longitude) {
          const mapsUrl = `https://maps.google.com/?q=${b.parent.latitude},${b.parent.longitude}`;
          text += `- Maps: ${await shortenUrl(mapsUrl)}\n`;
        }
        if (b.parent?.photo_maison_url) {
          text += `- Photo: ${await shortenUrl(b.parent.photo_maison_url)}\n`;
        }
        if (b.parent?.instructions_chauffeur) text += `- Info: ${b.parent.instructions_chauffeur}\n`;
        text += `\n`;
      }

      text += `\n*--- RETOUR (Stade -> Domicile) ---*\n`;
      if (retour.length === 0) text += `Aucun trajet\n`;
      for (let i = 0; i < retour.length; i++) {
        const b = retour[i];
        text += `${i+1}. *${b.enfant_nom || b.parent?.enfant_nom_prenom}*\n`;
        text += `- Adresse: ${b.parent?.adresse}\n`;
        if (b.parent?.latitude && b.parent?.longitude) {
          const mapsUrl = `https://maps.google.com/?q=${b.parent.latitude},${b.parent.longitude}`;
          text += `- Maps: ${await shortenUrl(mapsUrl)}\n`;
        }
        if (b.parent?.photo_maison_url) {
          text += `- Photo: ${await shortenUrl(b.parent.photo_maison_url)}\n`;
        }
        if (b.parent?.instructions_chauffeur) text += `- Info: ${b.parent.instructions_chauffeur}\n`;
        text += `\n`;
      }

      const cleanPhone = driverPhone.replace(/\D/g, "");
      const url = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du message WhatsApp.");
    } finally {
      setIsGeneratingWA(false);
    }
  }

  // --- ACTIONS SETTINGS ---

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await supabase.from("settings").upsert({ key: "transport_jours", value: JSON.stringify(joursActifs) });
      await supabase.from("settings").upsert({ key: "transport_tarifs", value: JSON.stringify(tarifs) });
      await supabase.from("settings").upsert({ key: "transport_driver_phone", value: driverPhone });
      alert("Paramètres sauvegardés !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSavingSettings(false);
    }
  }

  function toggleJour(jour: string) {
    setJoursActifs(prev => prev.includes(jour) ? prev.filter(j => j !== jour) : [...prev, jour]);
  }

  // --- RENDERS ---

  return (
    <div className="flex flex-col gap-6 h-full max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
            <Bus className="h-8 w-8 text-fiver-green" /> Gestion Transport
          </h1>
          <p className="text-sm text-white/50">Gérez les inscriptions parents, réservations et fiches chauffeur.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {[
          { id: "parents" as const, label: "Parents Inscrits", icon: Users },
          { id: "bookings" as const, label: "Réservations", icon: Calendar },
          { id: "driver" as const, label: "Fiche Chauffeur", icon: FileText },
          { id: "settings" as const, label: "Paramètres", icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all",
              activeTab === tab.id ? "bg-fiver-green text-fiver-black shadow-lg shadow-fiver-green/20" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#121212] rounded-xl border border-white/10 p-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-fiver-green" />
          </div>
        ) : (
          <>
            {/* TAB: PARENTS */}
            {activeTab === "parents" && (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-white/70">
                  <thead className="bg-white/5 text-xs font-bold uppercase tracking-wider text-white">
                    <tr>
                      <th className="p-4 rounded-tl-lg">Parent</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Enfant(s)</th>
                      <th className="p-4">Adresse</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 rounded-tr-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parents.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center italic text-white/30">Aucun parent inscrit pour le moment.</td></tr>
                    ) : parents.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white">{p.prenom} {p.nom}</td>
                        <td className="p-4 font-mono text-xs">{p.telephone}</td>
                        <td className="p-4 text-xs font-medium bg-white/5 rounded my-2 inline-block px-2 py-1">{p.enfant_nom_prenom || "Non spécifié"}</td>
                        <td className="p-4 max-w-[200px] truncate text-xs">{p.adresse}</td>
                        <td className="p-4">
                          <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", 
                            p.statut === "valide" ? "bg-green-500/10 text-green-500" : 
                            p.statut === "bloque" ? "bg-red-500/10 text-red-500" : 
                            "bg-amber-500/10 text-amber-500")}>
                            {p.statut.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          {p.statut !== "valide" && (
                            <button onClick={() => updateParentStatus(p.id, "valide")} className="p-1.5 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30" title="Valider">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {p.statut !== "bloque" && (
                            <button onClick={() => updateParentStatus(p.id, "bloque")} className="p-1.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30" title="Bloquer">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: BOOKINGS */}
            {activeTab === "bookings" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-sm text-white/70">
                    <thead className="bg-white/5 text-xs font-bold uppercase tracking-wider text-white">
                      <tr>
                        <th className="p-4 rounded-tl-lg">Date</th>
                        <th className="p-4">Parent</th>
                        <th className="p-4">Enfant(s)</th>
                        <th className="p-4">Trajet</th>
                        <th className="p-4 text-right">Montant</th>
                        <th className="p-4 rounded-tr-lg text-right">Statut / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bookings.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center italic text-white/30">Aucune réservation trouvée.</td></tr>
                      ) : bookings.map(b => (
                        <tr key={b.id} className="hover:bg-white/[0.02]">
                          <td className="p-4 font-bold text-white">{new Date(b.date_seance).toLocaleDateString("fr-FR", { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                          <td className="p-4 font-bold text-white">{b.parent?.prenom} {b.parent?.nom} <br/><span className="text-xs font-normal text-white/50">{b.parent?.telephone}</span></td>
                          <td className="p-4 font-bold text-fiver-green">{b.enfant_nom || b.parent?.enfant_nom_prenom}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded bg-fiver-green/10 text-fiver-green text-[10px] font-bold uppercase">{b.type_trajet.replace("_", " ")}</span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-fiver-green">{b.montant} MRU</td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", 
                                b.statut === "annule" ? "bg-red-500/10 text-red-400" : 
                                b.statut === "en_attente" ? "bg-amber-500/10 text-amber-400" :
                                "bg-green-500/10 text-green-400")}>
                              {b.statut.replace("_", " ")}
                            </span>
                            {b.statut === "en_attente" && (
                              <button onClick={() => validerBooking(b.id)} className="ml-2 rounded bg-green-500/20 p-1.5 text-green-400 hover:bg-green-500/30" title="Valider">
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: DRIVER SHEET */}
            {activeTab === "driver" && (
              <div className="flex flex-col h-full">
                <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-bold uppercase tracking-wide text-white/50">Date :</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-fiver-green focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={generateWhatsAppDriver} disabled={isGeneratingWA} className="flex items-center gap-2 rounded-md bg-[#25D366]/20 px-4 py-2 text-sm font-bold text-[#25D366] hover:bg-[#25D366]/30 transition-colors disabled:opacity-50">
                      {isGeneratingWA ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} WhatsApp
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition-colors">
                      <Download className="h-4 w-4" /> Imprimer / PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 print:overflow-visible print:p-0">
                  <div className="bg-white text-black p-8 rounded-xl shadow-2xl mx-auto max-w-4xl print:shadow-none print:p-0" id="driver-sheet">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                      <h2 className="text-3xl font-black uppercase tracking-tight">Fiche Navette</h2>
                      <p className="text-lg font-bold text-gray-500 mt-2">{new Date(selectedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:grid-cols-2 print:gap-8">
                      
                      {/* SECTION ALLER */}
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-green-600 border-b border-green-200 pb-2 mb-4 flex items-center gap-2">
                          <Bus className="h-6 w-6" /> ALLER (DOMICILE ➔ STADE)
                        </h3>
                        <div className="flex flex-col gap-4">
                          {bookings.filter(b => b.type_trajet === "aller" || b.type_trajet === "aller_retour").map((b, idx) => (
                            <div key={`aller-${b.id}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-black text-lg">{idx + 1}. {b.enfant_nom || b.parent?.enfant_nom_prenom}</span>
                                  <p className="text-sm font-bold text-gray-500">Parent: {b.parent?.prenom} {b.parent?.nom} • {b.parent?.telephone}</p>
                                </div>
                                {b.parent?.photo_maison_url && (
                                  <a href={b.parent.photo_maison_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                    <img src={b.parent.photo_maison_url} alt="Maison" className="h-12 w-12 rounded object-cover border border-gray-300" />
                                  </a>
                                )}
                              </div>
                              <div className="mt-2 text-sm">
                                <p className="font-bold flex items-start gap-1"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500"/> {b.parent?.adresse}</p>
                                {b.parent?.instructions_chauffeur && <p className="mt-1 text-gray-600 italic text-xs bg-yellow-100 p-1.5 rounded">"{b.parent.instructions_chauffeur}"</p>}
                                {b.parent?.latitude && b.parent?.longitude && (
                                  <a href={`https://maps.google.com/?q=${b.parent.latitude},${b.parent.longitude}`} target="_blank" rel="noreferrer" className="text-blue-500 text-xs font-bold mt-2 inline-block hover:underline">🗺️ Ouvrir dans Google Maps</a>
                                )}
                              </div>
                            </div>
                          ))}
                          {bookings.filter(b => b.type_trajet === "aller" || b.type_trajet === "aller_retour").length === 0 && <p className="text-sm text-gray-400 italic">Aucun trajet aller.</p>}
                        </div>
                      </div>

                      {/* SECTION RETOUR */}
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-red-600 border-b border-red-200 pb-2 mb-4 flex items-center gap-2">
                          <Bus className="h-6 w-6" /> RETOUR (STADE ➔ DOMICILE)
                        </h3>
                        <div className="flex flex-col gap-4">
                          {bookings.filter(b => b.type_trajet === "retour" || b.type_trajet === "aller_retour").map((b, idx) => (
                            <div key={`retour-${b.id}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-black text-lg">{idx + 1}. {b.enfant_nom || b.parent?.enfant_nom_prenom}</span>
                                  <p className="text-sm font-bold text-gray-500">Parent: {b.parent?.prenom} {b.parent?.nom} • {b.parent?.telephone}</p>
                                </div>
                                {b.parent?.photo_maison_url && (
                                  <a href={b.parent.photo_maison_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                    <img src={b.parent.photo_maison_url} alt="Maison" className="h-12 w-12 rounded object-cover border border-gray-300" />
                                  </a>
                                )}
                              </div>
                              <div className="mt-2 text-sm">
                                <p className="font-bold flex items-start gap-1"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500"/> {b.parent?.adresse}</p>
                                {b.parent?.instructions_chauffeur && <p className="mt-1 text-gray-600 italic text-xs bg-yellow-100 p-1.5 rounded">"{b.parent.instructions_chauffeur}"</p>}
                                {b.parent?.latitude && b.parent?.longitude && (
                                  <a href={`https://maps.google.com/?q=${b.parent.latitude},${b.parent.longitude}`} target="_blank" rel="noreferrer" className="text-blue-500 text-xs font-bold mt-2 inline-block hover:underline">🗺️ Ouvrir dans Google Maps</a>
                                )}
                              </div>
                            </div>
                          ))}
                          {bookings.filter(b => b.type_trajet === "retour" || b.type_trajet === "aller_retour").length === 0 && <p className="text-sm text-gray-400 italic">Aucun trajet retour.</p>}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-2xl">
                <div className="mb-8">
                  <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Jours d'entraînement (Transport)</h3>
                  <div className="flex flex-wrap gap-3">
                    {["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].map(jour => (
                      <label key={jour} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors", joursActifs.includes(jour) ? "border-fiver-green bg-fiver-green/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                        <input type="checkbox" checked={joursActifs.includes(jour)} onChange={() => toggleJour(jour)} className="h-4 w-4 accent-fiver-green" />
                        <span className="font-bold capitalize text-white">{jour}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Tarifs par séance (MRU)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Aller seul</label>
                      <input type="number" value={tarifs.aller} onChange={e => setTarifs({ ...tarifs, aller: parseInt(e.target.value) || 0 })} className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 font-mono font-bold text-white focus:border-fiver-green focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Retour seul</label>
                      <input type="number" value={tarifs.retour} onChange={e => setTarifs({ ...tarifs, retour: parseInt(e.target.value) || 0 })} className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 font-mono font-bold text-white focus:border-fiver-green focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Aller-Retour</label>
                      <input type="number" value={tarifs.aller_retour} onChange={e => setTarifs({ ...tarifs, aller_retour: parseInt(e.target.value) || 0 })} className="w-full rounded-md border-white/10 bg-white/5 px-4 py-3 font-mono font-bold text-white focus:border-fiver-green focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase tracking-wide text-white">Chauffeur</h3>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Numéro WhatsApp du Chauffeur</label>
                    <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="Ex: 22236123456" className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 font-mono text-white focus:border-fiver-green focus:outline-none" />
                    <p className="mt-1.5 text-xs text-white/40">Si renseigné, le bouton d'envoi WhatsApp ouvrira directement la conversation avec le chauffeur.</p>
                  </div>
                </div>

                <button onClick={saveSettings} disabled={savingSettings} className="flex items-center justify-center gap-2 rounded-md bg-fiver-green px-8 py-3.5 font-bold uppercase tracking-wide text-fiver-black transition-transform hover:scale-105 disabled:opacity-50">
                  {savingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sauvegarder les paramètres"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
