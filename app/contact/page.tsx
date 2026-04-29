"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { supabase } from "@/lib/supabase";
import { MapPin, Phone, Mail, Clock, Check, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Removed static CONTACT_INFO array

const SUBJECTS = [
  { value: "", label: "Sélectionnez un sujet" },
  { value: "reservation", label: "Réservation de terrain" },
  { value: "inscription_academy", label: "Inscription Fiveur Academy" },
  { value: "inscription_loisirs", label: "Inscription Centre de Loisirs" },
  { value: "partenariat", label: "Partenariat" },
  { value: "solidarite", label: "Solidarité / Don" },
  { value: "autre", label: "Autre" },
];

const inputClass = "w-full rounded-sm border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [hours, setHours] = useState({ weekday: "Chargement...", weekend: "" });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("key, value").in("key", ["weekday_open", "weekday_close", "weekend_open", "weekend_close"]);
      if (data) {
        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        const formatTime = (t?: string) => t ? t.split(":")[0] + "h" + (t.split(":")[1] !== "00" ? t.split(":")[1] : "") : "";
        setHours({
          weekday: `Lun - Jeu : ${formatTime(map.weekday_open)} - ${formatTime(map.weekday_close)}`,
          weekend: `Ven - Dim : ${formatTime(map.weekend_open)} - ${formatTime(map.weekend_close)}`,
        });
      }
    }
    fetchSettings();
  }, []);

  const contactInfo = [
    { icon: MapPin, title: "Adresse", lines: ["Cité Concorde", "Nouakchott, Mauritanie"] },
    { icon: Phone, title: "Téléphone", lines: ["+222 48 81 38 22"] },
    { icon: Mail, title: "Email", lines: ["contact.fiveur@gmail.com"] },
    { icon: Clock, title: "Horaires", lines: hours.weekend ? [hours.weekday, hours.weekend] : [hours.weekday] },
  ];

  // Academy inscription extra fields
  const [playerName, setPlayerName] = useState("");
  const [playerAge, setPlayerAge] = useState("");
  const [playerCategory, setPlayerCategory] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerExperience, setPlayerExperience] = useState("");

  const isInscription = subject === "inscription_academy" || subject === "inscription_loisirs";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !subject) return;
    setSending(true);
    setError("");

    if (subject === "inscription_academy") {
      const { error: dbError } = await supabase.from("academy_players").insert({
        full_name: playerName,
        category: playerCategory || "U9",
        parent_name: name,
        parent_phone: phone,
        parent_email: email || null,
        status: "pending",
        notes: `Age: ${playerAge}\nPoste: ${playerPosition}\nExpérience: ${playerExperience}\nMessage: ${message}`,
      });
      if (dbError) {
        setError("Erreur lors de l'envoi. Veuillez réessayer.");
        setSending(false);
        return;
      }
    } else if (subject === "inscription_loisirs") {
      const { error: dbError } = await supabase.from("loisirs_children").insert({
        full_name: playerName,
        age: playerAge ? parseInt(playerAge) : null,
        category: playerCategory || "U9",
        parent_name: name,
        parent_phone: phone,
        parent_email: email || null,
        status: "pending",
        notes: message || null,
      });
      if (dbError) {
        setError("Erreur lors de l'envoi. Veuillez réessayer.");
        setSending(false);
        return;
      }
    } else {
      const contactData: Record<string, string | null> = {
        name,
        email: email || null,
        phone,
        subject,
        message: message || null,
      };

      const { error: dbError } = await supabase.from("contacts").insert(contactData);
      if (dbError) {
        setError("Erreur lors de l'envoi. Veuillez réessayer.");
        setSending(false);
        return;
      }
    }

    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: subject === "inscription_academy" ? "academy" : subject === "inscription_loisirs" ? "loisirs" : "contact",
          data: { name, email, phone, subject, message, playerName, playerAge, playerCategory },
          origin: window.location.origin
        })
      });
    } catch (err) { console.error("Notification failed", err); }

    setSent(true);
    setSending(false);
  }

  function handleReset() {
    setName(""); setEmail(""); setPhone(""); setSubject(""); setMessage("");
    setPlayerName(""); setPlayerAge(""); setPlayerCategory(""); setPlayerPosition(""); setPlayerExperience("");
    setSent(false); setError("");
  }

  return (
    <main>
      <Navigation />

      {/* Hero */}
      <section className="flex min-h-[40vh] items-center justify-center bg-fiver-black pt-20">
        <div className="hero-fade mx-auto max-w-3xl px-4 text-center">
          <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">
            Contactez-nous
          </span>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-bold uppercase leading-tight tracking-tight text-primary-foreground md:text-6xl">
            CONTACT
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70">
            Une question, une réservation, une inscription au club ? N&apos;hésitez pas à nous contacter.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info) => (
              <div key={info.title} className="stagger-card rounded-sm border border-border bg-card p-6 text-center transition-all duration-300 hover:border-fiver-green/30">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-fiver-green/10">
                  <info.icon className="h-5 w-5 text-fiver-green" />
                </div>
                <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-foreground">{info.title}</h3>
                <div className="mt-2 flex flex-col gap-1">
                  {info.lines.map((line) => (<p key={line} className="text-sm text-muted-foreground">{line}</p>))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-2xl px-4 lg:px-8">
          <div className="mb-8 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">Message</span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Écrivez-nous
            </h2>
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center rounded-lg bg-card py-16 text-center shadow-sm">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fiver-green">
                <Check className="h-8 w-8 text-fiver-black" />
              </div>
              <h3 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-foreground">
                {isInscription ? "Demande d'inscription envoyée !" : "Message envoyé !"}
              </h3>
              <p className="mt-3 text-muted-foreground">
                Merci {name}, nous reviendrons vers vous dans les plus brefs délais.
              </p>
              <button onClick={handleReset} className="mt-6 rounded-sm bg-fiver-green px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90">
                Nouveau message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg bg-card p-6 shadow-sm md:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nom complet *</label>
                  <input id="contact-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Votre nom complet" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Téléphone *</label>
                  <input id="contact-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" placeholder="XX XX XX XX" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email (optionnel)</label>
                <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} placeholder="votre@email.com" className={inputClass} />
              </div>

              <div>
                <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Sujet *</label>
                <select id="contact-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
                  {SUBJECTS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>

              {/* Extra fields for Academy inscription */}
              {subject === "inscription_academy" && (
                <div className="animate-step flex flex-col gap-4 rounded-sm border border-fiver-green/20 bg-fiver-green/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fiver-green">Informations du joueur</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nom du joueur *</label>
                      <input type="text" required value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={50} placeholder="Prénom et nom" className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Âge *</label>
                      <input type="number" required min="6" max="40" value={playerAge} onChange={(e) => setPlayerAge(e.target.value)} placeholder="Ex: 14" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Catégorie souhaitée</label>
                      <select value={playerCategory} onChange={(e) => setPlayerCategory(e.target.value)} className={inputClass}>
                        <option value="">Sélectionner</option>
                        <option value="U5/U7">U5 / U7 (5-6 ans)</option>
                        <option value="U9">U9 (7-8 ans)</option>
                        <option value="U11">U11 (9-10 ans)</option>
                        <option value="U11F">U11F (Filles 9-10 ans)</option>
                        <option value="U13">U13 (11-12 ans)</option>
                        <option value="U15">U15 (13-14 ans)</option>
                        <option value="U15F">U15F (Filles 13-14 ans)</option>
                        <option value="U17">U17 (15-16 ans)</option>
                        <option value="U18">U18 (17-18 ans)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Poste préféré</label>
                      <select value={playerPosition} onChange={(e) => setPlayerPosition(e.target.value)} className={inputClass}>
                        <option value="">Sélectionner</option>
                        <option value="Gardien">Gardien</option>
                        <option value="Défenseur">Défenseur</option>
                        <option value="Milieu">Milieu</option>
                        <option value="Attaquant">Attaquant</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Expérience football</label>
                    <select value={playerExperience} onChange={(e) => setPlayerExperience(e.target.value)} className={inputClass}>
                      <option value="">Sélectionner</option>
                      <option value="Débutant">Débutant</option>
                      <option value="1-2 ans">1-2 ans</option>
                      <option value="3-5 ans">3-5 ans</option>
                      <option value="5+ ans">5+ ans</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Extra fields for Centre de Loisirs inscription */}
              {subject === "inscription_loisirs" && (
                <div className="animate-step flex flex-col gap-4 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Informations de l&apos;enfant</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nom de l&apos;enfant *</label>
                      <input type="text" required value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={50} placeholder="Prénom et nom" className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Âge *</label>
                      <input type="number" required min="6" max="15" value={playerAge} onChange={(e) => setPlayerAge(e.target.value)} placeholder="Ex: 10" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Catégorie souhaitée</label>
                    <select value={playerCategory} onChange={(e) => setPlayerCategory(e.target.value)} className={inputClass}>
                      <option value="">Sélectionner</option>
                      <option value="U7">U7 (5-6 ans)</option>
                      <option value="U9">U9 (7-8 ans)</option>
                      <option value="U11">U11 (9-10 ans)</option>
                      <option value="U13">U13 (11-12 ans)</option>
                      <option value="U15">U15 (13-15 ans)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isInscription ? "Message / Informations complémentaires" : "Message *"}
                </label>
                <textarea id="contact-message" required={!isInscription} rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder={isInscription ? "Informations supplémentaires..." : "Votre message..."} className={cn(inputClass, "resize-none")} />
              </div>

              {error && <div className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

              <button type="submit" disabled={sending}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-50">
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</> : isInscription ? "Envoyer la demande d'inscription" : "Envoyer le message"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Google Maps */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-10 text-center">
            <span className="font-[var(--font-heading)] text-xs font-medium uppercase tracking-[0.3em] text-fiver-green">Localisation</span>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
              Nous trouver
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.3!2d-15.9786!3d18.0869!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDA1JzEyLjgiTiAxNcKwNTgnNDMuMCJX!5e0!3m2!1sfr!2smr!4v1710000000000!5m2!1sfr!2smr"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </div>
          <div className="mt-6 text-center">
            <a
              href="https://maps.app.goo.gl/oWC9jWktqMe4ye8a7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-sm bg-fiver-green px-6 py-3 text-sm font-bold uppercase tracking-wide text-fiver-black shadow-lg shadow-fiver-green/20 transition-transform hover:scale-105"
            >
              <ExternalLink className="h-4 w-4" /> Ouvrir dans Google Maps
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
