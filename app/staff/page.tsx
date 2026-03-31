"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StaffPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Identifiants incorrects. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    document.cookie = "fiver_session=true; path=/; max-age=86400; SameSite=Lax; Secure";

    // Route based on role: emails containing "admin" go to admin dashboard, others to gestion
    const userEmail = authData.user?.email?.toLowerCase() || "";
    if (userEmail.includes("admin")) {
      router.push("/staff/dashboard");
    } else {
      router.push("/staff/gestion/reservations");
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-fiver-black p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fiver-green/10">
            <Lock className="h-6 w-6 text-fiver-green" />
          </div>
          <Link href="/" className="inline-block">
            <Image src="/logo.png" alt="FIVEUR ARENA" width={120} height={40} className="mx-auto h-8 w-auto" />
          </Link>
          <p className="mt-3 text-sm text-primary-foreground/50">
            Espace réservé au personnel
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-6"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label htmlFor="staff-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-primary-foreground/50">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@fiversoccer.com"
              className="w-full rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-primary-foreground/50">
              Mot de passe
            </label>
            <input
              id="staff-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-sm border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Connexion"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 text-xs text-primary-foreground/40 transition-colors hover:text-primary-foreground/70"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour au site
        </Link>
      </div>
    </main>
  );
}
