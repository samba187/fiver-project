"use client";

import { useState } from "react";
import Image from "next/image";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Check, Calendar, Clock, MapPin, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const THEME_COLOR = "bg-[#c81054]"; // Magenta / Pink from the flyer
const THEME_TEXT = "text-[#c81054]";
const THEME_BORDER = "border-[#c81054]";

export default function SportFemininPage() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [telephone, setTelephone] = useState("");
  const [enfantInscrit, setEnfantInscrit] = useState(false);
  const [enfantNomPrenom, setEnfantNomPrenom] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom || !prenom || !dateNaissance || !telephone) return;
    if (enfantInscrit && !enfantNomPrenom) {
      setError("Veuillez indiquer le prénom et nom de l'enfant inscrit.");
      return;
    }
    
    setSubmitting(true);
    setError("");

    // 1. Save to DB
    const { error: dbError } = await supabase.from("sport_feminin_inscriptions").insert({
      nom: nom.trim(),
      prenom: prenom.trim(),
      date_naissance: dateNaissance,
      telephone: telephone.replace(/\D/g, ""),
      enfant_inscrit: enfantInscrit,
      enfant_nom_prenom: enfantInscrit ? enfantNomPrenom.trim() : null,
      statut: "en_attente"
    });

    if (dbError) {
      console.error(dbError);
      setError("Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
      setSubmitting(false);
      return;
    }

    // 2. Send notification
    try {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sport_feminin",
          data: {
            nom,
            prenom,
            telephone,
            dateNaissance,
            enfantInscrit,
            enfantNomPrenom: enfantInscrit ? enfantNomPrenom : undefined,
            tarif: enfantInscrit ? "800 MRU / mois" : "1000 MRU / mois"
          },
          origin: window.location.origin
        })
      });
    } catch (err) {
      console.error("Notify failed", err);
    }

    setSubmitting(false);
    setSent(true);
  }

  function handleReset() {
    setNom("");
    setPrenom("");
    setDateNaissance("");
    setTelephone("");
    setEnfantInscrit(false);
    setEnfantNomPrenom("");
    setSent(false);
    setError("");
  }

  const inputClass = cn(
    "w-full rounded-sm border border-input bg-background px-4 py-3 text-sm text-foreground",
    "placeholder:text-muted-foreground/50 focus:border-[#c81054] focus:outline-none focus:ring-1 focus:ring-[#c81054]"
  );

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative flex min-h-[50vh] items-center justify-center bg-black pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[#c81054]/10" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#c81054]/20 blur-[100px]" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-[#c81054]/20 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#c81054]/20 backdrop-blur-sm border border-[#c81054]/30">
            <Heart className="h-8 w-8 text-[#c81054]" fill="currentColor" />
          </div>
          
          <span className="inline-block rounded-full bg-[#c81054]/10 border border-[#c81054]/20 px-4 py-1.5 font-[var(--font-heading)] text-xs font-bold uppercase tracking-widest text-[#c81054] mb-4">
            100% Femme, 100% Positive
          </span>
          
          <h1 className="font-[var(--font-heading)] text-4xl font-black uppercase leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl">
            Séances de <br className="md:hidden" />
            <span className="text-[#c81054]">Sport Collectif</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-white/80 md:text-xl">
            Rejoins-nous pour bouger, t&apos;amuser et prendre du temps pour toi ! Peu importe ton âge, viens partager un moment de bien-être.
          </p>
          
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#inscription" className="inline-flex items-center gap-2 rounded-sm bg-[#c81054] px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-transform hover:scale-105 shadow-[0_0_20px_rgba(200,16,84,0.4)]">
              Je m&apos;inscris maintenant
            </a>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="bg-secondary/30 py-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-card p-8 shadow-sm text-center">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-[#c81054]" />
              <h3 className="mb-2 font-[var(--font-heading)] text-xl font-bold uppercase text-foreground">Quand ?</h3>
              <p className="text-muted-foreground font-medium">Tous les <strong className="text-foreground">Dimanches</strong><br/>de 10h30 à midi</p>
            </div>
            <div className="relative rounded-xl border-2 border-[#c81054] bg-[#c81054]/5 p-8 shadow-sm text-center transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c81054] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Encadrement
              </div>
              <Heart className="mx-auto mb-4 h-10 w-10 text-[#c81054]" fill="currentColor" />
              <h3 className="mb-2 font-[var(--font-heading)] text-xl font-bold uppercase text-[#c81054]">Coach Diplômée</h3>
              <p className="text-foreground font-medium">Une professionnelle dédiée pour t&apos;accompagner et te motiver.</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-card p-8 shadow-sm text-center">
              <MapPin className="mx-auto mb-4 h-10 w-10 text-[#c81054]" />
              <h3 className="mb-2 font-[var(--font-heading)] text-xl font-bold uppercase text-foreground">Où ?</h3>
              <p className="text-muted-foreground font-medium">Fiveur Arena<br/><span className="text-sm">Cité Concorde</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-10">
        <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="mb-8 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground">Tarifs Mensuels</h2>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase text-muted-foreground mb-4">Tarif Standard</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-[var(--font-heading)] text-5xl font-black text-foreground">1000</span>
                <span className="text-sm font-bold uppercase text-muted-foreground">MRU / mois</span>
              </div>
            </div>
            
            <div className="relative rounded-xl border-2 border-[#c81054] bg-[#c81054]/10 p-8 shadow-sm overflow-hidden">
              <div className="absolute -right-10 top-6 rotate-45 bg-[#c81054] text-white text-[10px] font-bold uppercase tracking-widest px-10 py-1">
                -20%
              </div>
              <h3 className="font-[var(--font-heading)] text-xl font-bold uppercase text-[#c81054] mb-4">Tarif Réduit</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-[var(--font-heading)] text-5xl font-black text-[#c81054]">800</span>
                <span className="text-sm font-bold uppercase text-[#c81054]">MRU / mois</span>
              </div>
              <p className="mt-3 text-xs font-medium text-foreground">Si tu as un enfant inscrit à Fiveur Academy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inscription Form */}
      <section id="inscription" className="bg-secondary/50 py-12">
        <div className="mx-auto max-w-2xl px-4 lg:px-8">
          <div className="mb-10 text-center">
            <span className="font-[var(--font-heading)] text-xs font-bold uppercase tracking-[0.3em] text-[#c81054]">Rejoins-nous</span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Formulaire d&apos;inscription
            </h2>
            <p className="mt-3 text-muted-foreground">Remplis ce formulaire pour réserver ta place. Le paiement se fera sur place.</p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-card border border-border py-16 text-center shadow-lg">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#c81054]/10">
                <Check className="h-10 w-10 text-[#c81054]" />
              </div>
              <h3 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-foreground">Inscription Enregistrée !</h3>
              <p className="mt-4 px-6 text-muted-foreground">
                Merci <strong>{prenom}</strong> ! Ta demande a bien été prise en compte.<br/>Notre équipe va te recontacter très vite pour confirmer ta place.
              </p>
              <a href="/" className="mt-8 rounded-sm bg-[#c81054] px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90">
                Retour à l'accueil
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl bg-card border border-border p-6 shadow-lg md:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="nom" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom *</label>
                  <input id="nom" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ton nom" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="prenom" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Prénom *</label>
                  <input id="prenom" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ton prénom" className={inputClass} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dob" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Date de naissance *</label>
                  <input id="dob" type="date" required value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Numéro de téléphone *</label>
                  <input id="phone" type="tel" required value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+222 XX XX XX XX" className={inputClass} />
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-[#c81054]/20 bg-[#c81054]/5 p-5">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="flex h-6 items-center">
                    <input 
                      type="checkbox" 
                      checked={enfantInscrit} 
                      onChange={(e) => setEnfantInscrit(e.target.checked)}
                      className="h-5 w-5 rounded border-input bg-background text-[#c81054] focus:ring-[#c81054] focus:ring-offset-background"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-foreground">J&apos;ai un enfant inscrit à Fiveur Academy</span>
                    <span className="block text-xs text-muted-foreground mt-1">Coche cette case pour bénéficier de la réduction de 20% sur ton abonnement mensuel.</span>
                  </div>
                </label>
                {enfantInscrit && (
                  <div className="mt-4 pt-4 border-t border-[#c81054]/20 animate-in fade-in slide-in-from-top-2">
                    <label htmlFor="enfantNomPrenom" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#c81054]">Prénom et nom de l&apos;enfant *</label>
                    <input 
                      id="enfantNomPrenom" 
                      type="text" 
                      required 
                      value={enfantNomPrenom} 
                      onChange={(e) => setEnfantNomPrenom(e.target.value)} 
                      placeholder="Nom de l'enfant inscrit à l'académie" 
                      className={inputClass} 
                    />
                  </div>
                )}
              </div>

              {error && <div className="rounded-sm bg-red-500/10 px-4 py-3 text-sm text-red-500 font-medium">{error}</div>}

              <button type="submit" disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#c81054] py-4 text-sm font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Envoi en cours...</> : "Valider mon inscription"}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
