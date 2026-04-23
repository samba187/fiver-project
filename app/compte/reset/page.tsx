"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Supabase will auto-detect the recovery token from the URL hash
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User has a valid recovery token
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au minimum 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Erreur lors de la mise à jour du mot de passe. Le lien a peut-être expiré.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/compte/dashboard");
    }, 2000);
  }

  const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green transition-colors";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-fiver-black p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/"><Image src="/logo.png" alt="FIVEUR ARENA" width={140} height={46} className="mx-auto h-10 w-auto" /></Link>
          <p className="mt-4 text-sm text-white/50">Choisissez un nouveau mot de passe</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-green-500/20 bg-green-500/5 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fiver-green">
              <Check className="h-6 w-6 text-fiver-black" />
            </div>
            <p className="text-sm font-medium text-white">Mot de passe mis à jour avec succès !</p>
            <p className="text-xs text-white/40">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-6">
            {error && (
              <div className="flex items-start gap-2 rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères" minLength={6} className={`${inputClass} pl-10`} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Confirmer</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe" minLength={6} className={`${inputClass} pl-10`} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
