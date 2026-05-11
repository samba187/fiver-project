"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { supabase } from "@/lib/supabase";
import { Loader2, MapPin, Camera, Bus, Calendar, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_COLOR = "bg-fiver-green";
const THEME_TEXT = "text-fiver-green";

interface ParentProfile {
  id: number;
  telephone: string;
  nom: string;
  prenom: string;
  adresse: string;
  statut: string;
  enfant_nom_prenom: string | null;
}

const BANKILY_NUMBER = "36 29 01 29"; // Default from previous files

export default function TransportPage() {
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Tabs for auth
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Auth forms
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("");
  const [enfantNom, setEnfantNom] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Dashboard state
  const [joursActifs, setJoursActifs] = useState<string[]>([]);
  const [tarifs, setTarifs] = useState({ aller: 60, retour: 60, aller_retour: 120 });
  const [prochainesDates, setProchainesDates] = useState<Date[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.from("transport_parents")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      setProfile(data || null);
      if (data) fetchDashboardData(data.id);
    } catch (err) {
      console.error("Error fetching profile", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardData(parentId: number) {
    try {
      // Fetch settings
      const { data: settings } = await supabase.from("settings").select("key, value").in("key", ["transport_jours", "transport_tarifs"]);
      let jours = ["mercredi", "vendredi"];
      let t = { aller: 60, retour: 60, aller_retour: 120 };
      
      settings?.forEach(s => {
        if (s.key === "transport_jours") jours = JSON.parse(s.value);
        if (s.key === "transport_tarifs") t = JSON.parse(s.value);
      });
      setJoursActifs(jours);
      setTarifs(t);

      // Generate next 4 dates based on active days
      const dates = generateNextDates(jours, 4);
      setProchainesDates(dates);

      // Fetch bookings
      const { data: b } = await supabase.from("transport_bookings").select("*").eq("parent_id", parentId);
      if (b) setBookings(b);

    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  }

  function generateNextDates(daysStr: string[], count: number) {
    const dayMap: Record<string, number> = { "dimanche": 0, "lundi": 1, "mardi": 2, "mercredi": 3, "jeudi": 4, "vendredi": 5, "samedi": 6 };
    const allowedDays = daysStr.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
    
    const dates: Date[] = [];
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1); // Start from tomorrow (cannot book for today)

    while (dates.length < count) {
      if (allowedDays.includes(d.getDay())) {
        dates.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  // --- AUTH ACTIONS ---

  // Use a simple, standard domain to avoid Supabase strict email validation issues
  const formatEmail = (p: string) => `${p.replace(/\D/g, "").trim()}@transport.fiveur.com`;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: formatEmail(phone), password });
    if (error) setAuthError("Identifiants incorrects.");
    setAuthLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password || !nom || !prenom || !adresse) {
      setAuthError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      // 1. Check if phone already in academy_registrations to link
      const { data: childMatch } = await supabase.from("academy_registrations")
        .select("id, prenom, nom").eq("telephone_parent", phone).limit(1).maybeSingle();

      // 2. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formatEmail(phone),
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Inscription échouée");

      // 3. Create profile
      const { error: profileError } = await supabase.from("transport_parents").insert({
        user_id: authData.user.id,
        telephone: phone,
        nom,
        prenom,
        adresse,
        latitude: lat,
        longitude: lng,
        photo_maison_url: photoUrl,
        instructions_chauffeur: instructions,
        registration_id: childMatch ? childMatch.id : null,
        enfant_nom_prenom: childMatch ? `${childMatch.prenom} ${childMatch.nom}` : enfantNom,
        statut: "en_attente"
      });

      if (profileError) throw profileError;
      
      // Auto login will happen via onAuthStateChange

    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Une erreur est survenue.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // --- LOCATION & PHOTO ---

  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => alert("Impossible de récupérer la position. Veuillez autoriser l'accès.")
      );
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("transport_photos").upload(filename, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("transport_photos").getPublicUrl(filename);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveProfileEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setAuthLoading(true);
    try {
      const { error } = await supabase.from("transport_parents").update({
        adresse,
        latitude: lat,
        longitude: lng,
        photo_maison_url: photoUrl,
        instructions_chauffeur: instructions,
        enfant_nom_prenom: enfantNom
      }).eq("id", profile.id);
      
      if (error) throw error;
      setIsEditingProfile(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setAuthLoading(false);
    }
  }

  function startEditingProfile() {
    if (!profile) return;
    setAdresse(profile.adresse || "");
    setLat(profile.latitude);
    setLng(profile.longitude);
    setPhotoUrl(profile.photo_maison_url || "");
    setInstructions(profile.instructions_chauffeur || "");
    setEnfantNom(profile.enfant_nom_prenom || "");
    setIsEditingProfile(true);
  }

  // --- BOOKING ---

  async function bookTrajet(date: Date, type: "aller" | "retour" | "aller_retour", enfantNom: string) {
    if (!profile) return;
    setBookingLoading(true);
    try {
      const montant = type === "aller_retour" ? tarifs.aller_retour : tarifs.aller;
      const dateStr = date.toISOString().split("T")[0];
      
      const { error } = await supabase.from("transport_bookings").insert({
        parent_id: profile.id,
        date_seance: dateStr,
        type_trajet: type,
        montant,
        statut: 'en_attente',
        enfant_nom: enfantNom
      });

      if (error) throw error;
      await fetchDashboardData(profile.id);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la réservation.");
    } finally {
      setBookingLoading(false);
    }
  }

  async function cancelBooking(id: number) {
    if (!confirm("Voulez-vous annuler cette réservation ?")) return;
    setBookingLoading(true);
    try {
      await supabase.from("transport_bookings").delete().eq("id", id);
      if (profile) await fetchDashboardData(profile.id);
    } catch (err) {
      console.error(err);
    } finally {
      setBookingLoading(false);
    }
  }

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d]">
        <Loader2 className="h-8 w-8 animate-spin text-fiver-green" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] font-sans text-white selection:bg-fiver-green selection:text-fiver-black">
      <Navigation />

      <div className="pt-24 pb-12">
        <div className="mx-auto max-w-4xl px-4">
          
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fiver-green/10 mb-4">
              <Bus className="h-8 w-8 text-fiver-green" />
            </div>
            <h1 className="font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight md:text-5xl">
              Navette <span className={THEME_TEXT}>Academy</span>
            </h1>
            <p className="mt-2 text-white/50">Réservez le transport de votre enfant pour les entraînements.</p>
          </div>

          {!session ? (
            // --- AUTHENTICATION ---
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-xl">
              <div className="flex border-b border-white/10">
                <button onClick={() => setAuthTab("login")} className={cn("flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors", authTab === "login" ? "bg-white/5 text-fiver-green border-b-2 border-fiver-green" : "text-white/40 hover:bg-white/5")}>Connexion</button>
                <button onClick={() => setAuthTab("register")} className={cn("flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors", authTab === "register" ? "bg-white/5 text-fiver-green border-b-2 border-fiver-green" : "text-white/40 hover:bg-white/5")}>S'inscrire</button>
              </div>

              <div className="p-6">
                {authError && <div className="mb-6 rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{authError}</div>}

                {authTab === "login" ? (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Téléphone</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-fiver-green focus:outline-none" placeholder="Ex: 36476784" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Mot de passe</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-fiver-green focus:outline-none" placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={authLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-fiver-green py-3.5 font-bold uppercase tracking-wide text-fiver-black transition-transform hover:scale-[1.02] disabled:opacity-50">
                      {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Nom <span className="text-red-400">*</span></label>
                        <input value={nom} onChange={e => setNom(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Prénom <span className="text-red-400">*</span></label>
                        <input value={prenom} onChange={e => setPrenom(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" required />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Téléphone (identifiant) <span className="text-red-400">*</span></label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" placeholder="Ce numéro doit correspondre à celui de l'enfant" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Nom(s) & Prénom(s) de(s) enfant(s) <span className="text-red-400">*</span></label>
                      <input value={enfantNom} onChange={e => setEnfantNom(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" placeholder="Séparez les noms par une virgule (ex: Ali, Ahmed)" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Mot de passe <span className="text-red-400">*</span></label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" minLength={6} required />
                    </div>
                    
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <h3 className="mb-4 text-sm font-bold uppercase text-white">Coordonnées de ramassage</h3>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Adresse complète <span className="text-red-400">*</span></label>
                          <input value={adresse} onChange={e => setAdresse(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" placeholder="Quartier, rue, repères..." required />
                        </div>
                        
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Position GPS</label>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={getLocation} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10">
                              <MapPin className="h-4 w-4" /> Utiliser ma position
                            </button>
                            {lat && lng && <span className="text-xs text-fiver-green font-bold flex items-center gap-1"><Check className="h-4 w-4"/> OK</span>}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Photo de la maison</label>
                          <div className="flex items-center gap-4">
                            {photoUrl ? (
                              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-white/20">
                                <Image src={photoUrl} alt="Maison" fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-white/20 bg-white/5">
                                <Camera className="h-6 w-6 text-white/30" />
                              </div>
                            )}
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="text-sm font-medium text-fiver-green hover:underline">
                              {uploadingPhoto ? "Chargement..." : photoUrl ? "Changer la photo" : "Ajouter une photo"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Instructions pour le chauffeur</label>
                          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-fiver-green focus:outline-none" placeholder="Ex: Portail bleu à côté de la pharmacie..." />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={authLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-fiver-green py-3.5 font-bold uppercase tracking-wide text-fiver-black transition-transform hover:scale-[1.02] disabled:opacity-50">
                      {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "S'inscrire"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : profile ? (
            // --- DASHBOARD ---
            <div className="flex flex-col gap-6">
              
              {/* Header Profile */}
              <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-white/10 bg-[#121212] p-6 shadow-lg gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Bonjour, {profile.prenom} {profile.nom}</h2>
                    <button onClick={startEditingProfile} className="text-xs font-bold uppercase text-fiver-green hover:underline">Modifier</button>
                  </div>
                  <p className="text-sm text-white/50">Enfant(s) : <strong className="text-white">{profile.enfant_nom_prenom || "Non lié"}</strong></p>
                </div>
                <button onClick={handleLogout} className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                  Déconnexion
                </button>
              </div>

              {/* Payment Alert */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 flex gap-4">
                <AlertCircle className="h-6 w-6 text-blue-400 shrink-0" />
                <div className="text-sm text-blue-100">
                  <p className="font-bold mb-1 text-blue-300 uppercase tracking-wide">Paiement des trajets</p>
                  <p>Veuillez régler vos réservations via <strong>Bankily</strong> au <strong className="text-white text-base bg-blue-500/20 px-2 py-0.5 rounded">{BANKILY_NUMBER}</strong>.</p>
                  <p className="mt-1 opacity-80">Précisez le nom de l'enfant en motif. Toute réservation non payée ne sera pas validée par l'administration.</p>
                </div>
              </div>

              {isEditingProfile ? (
                <div className="rounded-xl border border-white/10 bg-[#121212] p-6">
                  <h3 className="mb-4 font-[var(--font-heading)] text-lg font-bold uppercase text-white border-b border-white/10 pb-4">Modifier mes informations</h3>
                  <form onSubmit={saveProfileEdit} className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Nom(s) & Prénom(s) de(s) enfant(s)</label>
                      <input value={enfantNom} onChange={e => setEnfantNom(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" placeholder="Séparez les noms par une virgule (ex: Ali, Ahmed)" />
                      <p className="mt-1 text-[10px] text-white/40">Séparez les enfants par une virgule pour les gérer indépendamment.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Adresse complète</label>
                      <input value={adresse} onChange={e => setAdresse(e.target.value)} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-fiver-green focus:outline-none" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Position GPS</label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={getLocation} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10">
                          <MapPin className="h-4 w-4" /> Utiliser ma position
                        </button>
                        {lat && lng && <span className="text-xs text-fiver-green font-bold flex items-center gap-1"><Check className="h-4 w-4"/> OK</span>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Photo de la maison</label>
                      <div className="flex items-center gap-4">
                        {photoUrl ? (
                          <div className="relative h-16 w-16 overflow-hidden rounded-md border border-white/20">
                            <Image src={photoUrl} alt="Maison" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-white/20 bg-white/5">
                            <Camera className="h-6 w-6 text-white/30" />
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="text-sm font-medium text-fiver-green hover:underline">
                          {uploadingPhoto ? "Chargement..." : photoUrl ? "Changer la photo" : "Ajouter une photo"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">Instructions pour le chauffeur</label>
                      <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-fiver-green focus:outline-none" />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 rounded-md border border-white/10 py-3 font-bold uppercase tracking-wide text-white/70 hover:bg-white/5">Annuler</button>
                      <button type="submit" disabled={authLoading} className="flex-1 flex justify-center items-center gap-2 rounded-md bg-fiver-green py-3 font-bold uppercase tracking-wide text-fiver-black hover:scale-[1.02]">
                        {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sauvegarder"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : profile.statut !== "valide" ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                  <h3 className="mb-2 text-lg font-bold text-amber-500">Compte en attente de validation</h3>
                  <p className="text-amber-500/80">Votre compte doit être validé par l'administration avant de pouvoir réserver des trajets. Cela prend généralement quelques heures.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Prochaines Dates */}
                  <div className="rounded-xl border border-white/10 bg-[#121212] p-6">
                    <h3 className="mb-6 flex items-center gap-2 font-[var(--font-heading)] text-xl font-bold uppercase tracking-wide text-white">
                      <Calendar className="h-5 w-5 text-fiver-green" /> Réserver un trajet
                    </h3>
                    
                    <div className="flex flex-col gap-4">
                      {prochainesDates.map(date => {
                        const dateStr = date.toISOString().split("T")[0];
                        const displayDate = date.toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' });
                        const enfants = (profile.enfant_nom_prenom || "").split(',').map(e => e.trim()).filter(Boolean);
                        
                        return (
                          <div key={dateStr} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                              <span className="font-bold capitalize text-white">{displayDate}</span>
                            </div>

                            {enfants.length === 0 ? (
                              <p className="text-sm text-red-400">Veuillez renseigner le nom de vos enfants (bouton Modifier en haut) pour pouvoir réserver.</p>
                            ) : (
                              enfants.map((enfant, idx) => {
                                const existingBooking = bookings.find(b => b.date_seance === dateStr && b.enfant_nom === enfant);
                                
                                return (
                                  <div key={idx} className="flex flex-col gap-2 bg-white/5 p-3 rounded border border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-sm text-white/80">{enfant}</span>
                                      {existingBooking && <span className="rounded-full bg-fiver-green/20 px-2 py-0.5 text-[10px] font-bold text-fiver-green uppercase tracking-wide">Réservé</span>}
                                    </div>
                                    
                                    {existingBooking ? (
                                      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                                        <span className="text-xs text-white/60">
                                          Trajet : <strong className="text-white uppercase">{existingBooking.type_trajet.replace("_", " ")}</strong> ({existingBooking.montant} MRU)
                                        </span>
                                        <button onClick={() => cancelBooking(existingBooking.id)} disabled={bookingLoading} className="text-[10px] font-bold uppercase text-red-400 hover:text-red-300">Annuler</button>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        <button onClick={() => bookTrajet(date, "aller", enfant)} disabled={bookingLoading} className="flex flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 py-2 hover:border-fiver-green hover:bg-fiver-green/5 transition-colors disabled:opacity-50">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Aller</span>
                                          <span className="text-xs font-black text-fiver-green">{tarifs.aller} MRU</span>
                                        </button>
                                        <button onClick={() => bookTrajet(date, "retour", enfant)} disabled={bookingLoading} className="flex flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 py-2 hover:border-fiver-green hover:bg-fiver-green/5 transition-colors disabled:opacity-50">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Retour</span>
                                          <span className="text-xs font-black text-fiver-green">{tarifs.retour} MRU</span>
                                        </button>
                                        <button onClick={() => bookTrajet(date, "aller_retour", enfant)} disabled={bookingLoading} className="flex flex-col items-center justify-center gap-1 rounded-md border border-fiver-green bg-fiver-green/10 py-2 hover:bg-fiver-green/20 transition-colors disabled:opacity-50">
                                          <span className="text-[10px] font-bold uppercase tracking-wide text-fiver-green">Les 2</span>
                                          <span className="text-xs font-black text-fiver-green">{tarifs.aller_retour} MRU</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-center text-xs text-white/40">Les réservations doivent être faites au plus tard la veille du trajet.</p>
                  </div>

                  {/* Historique */}
                  <div className="rounded-xl border border-white/10 bg-[#121212] p-6">
                    <h3 className="mb-6 flex items-center gap-2 font-[var(--font-heading)] text-xl font-bold uppercase tracking-wide text-white">
                      <Bus className="h-5 w-5 text-fiver-green" /> Vos Réservations
                    </h3>
                    <div className="flex flex-col gap-3">
                      {bookings.length === 0 ? (
                        <p className="text-center text-sm text-white/40 italic py-8">Aucune réservation pour le moment.</p>
                      ) : (
                        bookings.sort((a,b) => new Date(b.date_seance).getTime() - new Date(a.date_seance).getTime()).map(b => (
                          <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-4">
                            <div>
                              <p className="font-bold text-white">{new Date(b.date_seance).toLocaleDateString("fr-FR")}</p>
                              <p className="text-xs font-bold text-fiver-green mt-0.5">{b.enfant_nom || "Enfant inconnu"}</p>
                              <p className="text-xs text-white/50 uppercase mt-0.5">{b.type_trajet.replace("_", " ")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-fiver-green">{b.montant} MRU</p>
                              <p className={cn("text-[10px] font-bold uppercase px-2 py-1 inline-block rounded", 
                                b.statut === "annule" ? "bg-red-500/10 text-red-400" : 
                                b.statut === "en_attente" ? "bg-amber-500/10 text-amber-400" :
                                "bg-green-500/10 text-green-400")}>
                                {b.statut.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            // --- ERROR STATE: SESSION EXISTS BUT NO PROFILE ---
            <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center shadow-xl">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="mb-2 text-xl font-bold text-red-500">Erreur de profil</h3>
              <p className="mb-6 text-sm text-red-400/80">
                Votre compte a été créé, mais la sauvegarde de vos informations a échoué. 
                Vérifiez que la base de données est à jour (migration SQL exécutée).
              </p>
              <button onClick={handleLogout} className="rounded-md bg-white/10 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/20">
                Se déconnecter pour recommencer
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </main>
  );
}
