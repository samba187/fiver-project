"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Check, Loader2 } from "lucide-react";

const CATEGORIES = ["U7", "U9", "U11", "U13", "U15"];

export function InscriptionForm() {
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [category, setCategory] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childName || !category || !parentPhone || !parentName) return;
    setSubmitting(true);
    setError("");

    const { error: dbError } = await supabase.from("loisirs_children").insert({
      full_name: childName,
      age: childAge ? parseInt(childAge) : null,
      category,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail || null,
      status: "active",
    });

    if (dbError) {
      setError("Erreur lors de l'inscription. Veuillez réessayer.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  function handleReset() {
    setChildName(""); setChildAge(""); setCategory("");
    setParentPhone(""); setParentName(""); setParentEmail("");
    setSubmitted(false); setError("");
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fiver-black">
          <Check className="h-8 w-8 text-fiver-green" />
        </div>
        <h3 className="font-[var(--font-heading)] text-2xl font-bold uppercase text-fiver-black">
          Inscription envoyée !
        </h3>
        <p className="mt-3 text-fiver-black/70">
          Merci {parentName}, l&apos;inscription de {childName} en catégorie {category} a été enregistrée. Nous vous contacterons bientôt.
        </p>
        <button onClick={handleReset} className="mt-6 rounded-sm bg-fiver-black px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-green transition-opacity hover:opacity-90">
          Nouvelle inscription
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="child-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Nom de l&apos;enfant
        </label>
        <input id="child-name" type="text" required value={childName} onChange={(e) => setChildName(e.target.value)} maxLength={50} placeholder="Prénom et nom"
          className="w-full rounded-sm border border-fiver-black/20 bg-card px-4 py-2.5 text-sm text-fiver-black placeholder:text-fiver-black/30 focus:border-fiver-black focus:outline-none focus:ring-1 focus:ring-fiver-black" />
      </div>

      <div>
        <label htmlFor="child-age" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Âge de l&apos;enfant
        </label>
        <input id="child-age" type="number" min="6" max="15" value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="Ex: 11"
          className="w-full rounded-sm border border-fiver-black/20 bg-card px-4 py-2.5 text-sm text-fiver-black placeholder:text-fiver-black/30 focus:border-fiver-black focus:outline-none focus:ring-1 focus:ring-fiver-black" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Catégorie
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => setCategory(cat)}
              className={cn("rounded-sm py-2.5 text-sm font-semibold uppercase transition-colors", category === cat ? "bg-fiver-black text-fiver-green" : "bg-fiver-black/5 text-fiver-black hover:bg-fiver-black/10")}
            >{cat}</button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="parent-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Nom du parent
        </label>
        <input id="parent-name" type="text" required value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={50} placeholder="Votre nom"
          className="w-full rounded-sm border border-fiver-black/20 bg-card px-4 py-2.5 text-sm text-fiver-black placeholder:text-fiver-black/30 focus:border-fiver-black focus:outline-none focus:ring-1 focus:ring-fiver-black" />
      </div>

      <div>
        <label htmlFor="parent-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Téléphone du parent
        </label>
        <input id="parent-phone" type="tel" required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} maxLength={15} inputMode="tel" placeholder="Ex: XX XX XX XX"
          className="w-full rounded-sm border border-fiver-black/20 bg-card px-4 py-2.5 text-sm text-fiver-black placeholder:text-fiver-black/30 focus:border-fiver-black focus:outline-none focus:ring-1 focus:ring-fiver-black" />
      </div>

      <div>
        <label htmlFor="parent-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fiver-black/60">
          Email du parent
        </label>
        <input id="parent-email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} maxLength={100} placeholder="votre@email.com"
          className="w-full rounded-sm border border-fiver-black/20 bg-card px-4 py-2.5 text-sm text-fiver-black placeholder:text-fiver-black/30 focus:border-fiver-black focus:outline-none focus:ring-1 focus:ring-fiver-black" />
      </div>

      {error && <div className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

      <button type="submit" disabled={submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-fiver-black py-3 text-sm font-semibold uppercase tracking-wide text-fiver-green transition-opacity hover:opacity-90 disabled:opacity-50">
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</> : "Inscrire mon enfant"}
      </button>
    </form>
  );
}
