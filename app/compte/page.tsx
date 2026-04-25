"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, Lock, User, ArrowLeft, AlertCircle, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green transition-colors";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50";

export default function ComptePage() {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Si déjà connecté en tant que CLIENT, redirige vers le dashboard client
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const userEmail = data.user.email?.toLowerCase() || "";
        // Seuls les clients sont redirigés. Les admins voient le formulaire normalement.
        if (!userEmail.includes("admin") && !userEmail.includes("staff")) {
          router.replace("/compte/dashboard");
          return;
        }
      }
      setCheckingAuth(false);
    });
  }, [router]);

  function cleanPhone(p: string) {
    return p.replace(/\D/g, "");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);

    const cleaned = cleanPhone(phone);
    if (cleaned.length < 8) {
      setError("Numéro de téléphone invalide.");
      setLoading(false);
      return;
    }

    // Lookup email from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("email, is_suspended")
      .eq("phone", cleaned)
      .single();

    if (profileError || !profile) {
      setError("Aucun compte trouvé avec ce numéro. Créez un compte d'abord.");
      setLoading(false);
      return;
    }

    if (profile.is_suspended) {
      setError("Votre compte a été suspendu. Contactez l'administration de Fiveur Arena.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError) {
      setError("Mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/compte/dashboard");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);

    const cleaned = cleanPhone(phone);
    if (cleaned.length < 8) {
      setError("Numéro de téléphone invalide (minimum 8 chiffres).");
      setLoading(false);
      return;
    }
    if (!email.includes("@")) {
      setError("Adresse email invalide.");
      setLoading(false);
      return;
    }
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au minimum 2 caractères.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au minimum 6 caractères.");
      setLoading(false);
      return;
    }

    // Vérifier si le téléphone est déjà pris
    const { data: existingPhone } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("phone", cleaned)
      .single();

    if (existingPhone) {
      setError("Un compte existe déjà avec ce numéro de téléphone.");
      setLoading(false);
      return;
    }

    // Obtenir l'URL de base pour la redirection
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    // Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/compte/dashboard`,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Un compte existe déjà avec cet email.");
      } else {
        setError("Erreur lors de la création du compte : " + authError.message);
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Erreur inattendue lors de la création du compte.");
      setLoading(false);
      return;
    }

    // Créer le profil client
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: authData.user.id,
      phone: cleaned,
      name: name.trim(),
      email,
    });

    if (profileError) {
      setError("Compte créé mais erreur lors de la sauvegarde du profil. Contactez l'administration.");
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setSuccess("Compte créé avec succès ! Un lien de confirmation a été envoyé à votre adresse email. Si vous avez désactivé la confirmation email dans Supabase, veuillez vous connecter manuellement.");
      setLoading(false);
      return;
    }

    router.push("/compte/dashboard");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);

    const cleaned = cleanPhone(phone);
    if (cleaned.length < 8) {
      setError("Numéro de téléphone invalide.");
      setLoading(false);
      return;
    }

    // Lookup email
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("phone", cleaned)
      .single();

    if (!profile) {
      setError("Aucun compte trouvé avec ce numéro.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/compte/reset`,
    });

    if (resetError) {
      setError("Erreur lors de l'envoi de l'email de récupération.");
      setLoading(false);
      return;
    }

    setSuccess(`Un email de récupération a été envoyé à ${profile.email}. Vérifiez votre boîte mail.`);
    setLoading(false);
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-fiver-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-fiver-black p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image src="/logo.png" alt="FIVEUR ARENA" width={140} height={46} className="mx-auto h-10 w-auto" />
          </Link>
          <p className="mt-4 text-sm text-white/50">
            {mode === "login" && "Connectez-vous à votre espace client"}
            {mode === "register" && "Créez votre compte Fiveur Arena"}
            {mode === "forgot" && "Récupérez votre mot de passe"}
          </p>
        </div>

        {/* Tabs */}
        {mode !== "forgot" && (
          <div className="mb-6 flex rounded-sm border border-white/10 overflow-hidden">
            <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${mode === "login" ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
              <LogIn className="h-4 w-4" /> Connexion
            </button>
            <button onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${mode === "register" ? "bg-fiver-green text-fiver-black" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
              <UserPlus className="h-4 w-4" /> Inscription
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgot}
          className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-6">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 rounded-sm bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-xs text-green-400">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Phone */}
          <div>
            <label htmlFor="compte-phone" className={labelClass}>Numéro de téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input id="compte-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 48 81 38 22" inputMode="tel" maxLength={15}
                className={`${inputClass} pl-10`} />
            </div>
          </div>

          {/* Nom (inscription only) */}
          {mode === "register" && (
            <div>
              <label htmlFor="compte-name" className={labelClass}>Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input id="compte-name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom complet" maxLength={50}
                  className={`${inputClass} pl-10`} />
              </div>
            </div>
          )}

          {/* Email (inscription only) */}
          {mode === "register" && (
            <div>
              <label htmlFor="compte-email" className={labelClass}>Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input id="compte-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" maxLength={100}
                  className={`${inputClass} pl-10`} />
              </div>
            </div>
          )}

          {/* Password (login + register) */}
          {mode !== "forgot" && (
            <div>
              <label htmlFor="compte-password" className={labelClass}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input id="compte-password" type={showPwd ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Minimum 6 caractères" : "••••••••"}
                  minLength={mode === "register" ? 6 : undefined}
                  className={`${inputClass} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="mt-2 w-full rounded-sm bg-fiver-green py-3 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-fiver-black/20 border-t-fiver-black" />
                {mode === "login" ? "Connexion..." : mode === "register" ? "Création..." : "Envoi..."}
              </span>
            ) : (
              mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon compte" : "Envoyer le lien de récupération"
            )}
          </button>

          {/* Forgot password link */}
          {mode === "login" && (
            <button type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
              className="text-xs text-white/40 hover:text-fiver-green transition-colors text-center">
              Mot de passe oublié ?
            </button>
          )}

          {/* Back to login from forgot */}
          {mode === "forgot" && (
            <button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className="flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Retour à la connexion
            </button>
          )}
        </form>

        {/* Back to site */}
        <Link href="/"
          className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40 transition-colors hover:text-white/70">
          <ArrowLeft className="h-3 w-3" /> Retour au site
        </Link>
      </div>
    </main>
  );
}
