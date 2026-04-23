"use client";

import { useState, useEffect } from "react";
import { Save, Lock, User, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

const inputClass = "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none focus:ring-1 focus:ring-fiver-green transition-colors";

export default function ProfilPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setName(profile.name);
        setPhone(profile.phone);
        setEmail(profile.email);
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("user_profiles").update({ name: name.trim() }).eq("id", userData.user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess(false);

    if (newPwd.length < 6) {
      setPwdError("Le nouveau mot de passe doit contenir au minimum 6 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }

    setChangingPwd(true);

    // Verify current password by re-signing in
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email) {
      setPwdError("Erreur de session.");
      setChangingPwd(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPwd,
    });

    if (signInError) {
      setPwdError("Mot de passe actuel incorrect.");
      setChangingPwd(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });

    if (updateError) {
      setPwdError("Erreur lors de la mise à jour du mot de passe.");
      setChangingPwd(false);
      return;
    }

    setPwdSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setChangingPwd(false);
    setTimeout(() => setPwdSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-[var(--font-heading)] text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
        Mon Profil
      </h1>

      {/* Profile info */}
      <form onSubmit={handleSaveProfile} className="rounded-lg border border-white/5 bg-white/[0.02] p-5 mb-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-white/40 flex items-center gap-2">
          <User className="h-4 w-4" /> Informations
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Nom complet</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Téléphone</label>
            <input type="text" value={phone} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
            <p className="mt-1 text-[10px] text-white/20">Le numéro de téléphone ne peut pas être modifié.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Email</label>
            <input type="text" value={email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-sm bg-fiver-green px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-fiver-black hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saved ? <><Check className="h-4 w-4" /> Sauvegardé</> : saving ? "Sauvegarde..." : <><Save className="h-4 w-4" /> Sauvegarder</>}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-white/40 flex items-center gap-2">
          <Lock className="h-4 w-4" /> Changer le mot de passe
        </h2>

        {pwdError && (
          <div className="mb-4 flex items-start gap-2 rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{pwdError}</span>
          </div>
        )}
        {pwdSuccess && (
          <div className="mb-4 flex items-start gap-2 rounded-sm bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-400">
            <Check className="h-4 w-4 shrink-0 mt-0.5" /> Mot de passe mis à jour avec succès.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Mot de passe actuel</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={6} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">Confirmer le nouveau</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required minLength={6} className={inputClass} />
          </div>
        </div>

        <button type="submit" disabled={changingPwd}
          className="mt-4 flex items-center gap-2 rounded-sm bg-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20 disabled:opacity-50 transition-colors">
          {changingPwd ? "Modification..." : "Modifier le mot de passe"}
        </button>
      </form>
    </div>
  );
}
