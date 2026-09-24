"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, Loader2, Check, AlertTriangle, X as XIcon, ScanLine,
  CalendarClock, LogIn, Ban, KeyRound, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getMonthStatus, currentMonthStr, fetchSaisonCourante, type MonthStatus } from "@/lib/academy";

interface ScanRegistration {
  id: number;
  nom: string;
  prenom: string;
  nom_pere: string | null;
  categorie_foot: string | null;
  photo_url: string | null;
  badge_code: string | null;
  tarif_total: number;
  football: boolean;
  centre_loisirs: boolean;
  academy_payments_history?: { mois_concerne: string; montant: number; moyen_paiement?: string | null }[];
}

type ScanResult =
  | { kind: "ok"; reg: ScanRegistration; statut: MonthStatus; pending: boolean; derniereVenue?: string | null }
  | { kind: "autre_saison"; nom: string; saison: string }
  | { kind: "inconnu"; code: string };

const STATUT_UI: Record<MonthStatus, { label: string; tone: "ok" | "warn" | "bad"; detail: string }> = {
  paye: { label: "Abonnement à jour", tone: "ok", detail: "Accès autorisé" },
  off: { label: "Mois offert / OFF", tone: "ok", detail: "Accès autorisé" },
  partiel: { label: "Paiement partiel", tone: "warn", detail: "Reste une partie à régler" },
  non_paye: { label: "Abonnement non payé", tone: "bad", detail: "Le mois en cours n'a pas été réglé" },
};

const RESCAN_DELAY_MS = 10000;
const AUTO_DISMISS_MS = 2600;

export default function ScannerView() {
  const [saison, setSaison] = useState("");
  const [tarifMensuel, setTarifMensuel] = useState(0);
  const [registrations, setRegistrations] = useState<ScanRegistration[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [camError, setCamError] = useState("");
  const [engine, setEngine] = useState<"native" | "zxing" | "">("");

  const [result, setResult] = useState<ScanResult | null>(null);
  const [journal, setJournal] = useState<{ nom: string; heure: string; statut: MonthStatus; autorise: boolean }[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScanRef = useRef<Record<string, number>>({});
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userEmailRef = useRef<string | null>(null);

  // Index badge -> inscription, pour une résolution instantanée sans aller-retour réseau
  const indexRef = useRef<Record<string, ScanRegistration>>({});
  const busyRef = useRef(false);

  // ---------- Chargement des données (une seule fois) ----------
  const loadData = useCallback(async () => {
    setLoadingData(true);
    const courante = await fetchSaisonCourante();
    setSaison(courante);

    const { data: tarifData } = await supabase.from("settings").select("value").eq("key", "academy_tarifs").maybeSingle();
    if (tarifData?.value) {
      try { setTarifMensuel(JSON.parse(tarifData.value).tarifFoot || 0); } catch {}
    }

    const { data } = await supabase
      .from("academy_registrations")
      .select("id, nom, prenom, nom_pere, categorie_foot, photo_url, badge_code, tarif_total, football, centre_loisirs, academy_payments_history(mois_concerne, montant, moyen_paiement)")
      .eq("saison", courante);

    const list = (data as ScanRegistration[]) || [];
    const index: Record<string, ScanRegistration> = {};
    list.forEach(r => { if (r.badge_code) index[r.badge_code] = r; });
    indexRef.current = index;
    setRegistrations(list);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(({ data }) => { userEmailRef.current = data.user?.email || null; });
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Son ----------
  function beep(frequency: number, duration = 0.12) {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // ---------- Caméra ----------
  function stopCamera() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (zxingControlsRef.current) { try { zxingControlsRef.current.stop(); } catch {} zxingControlsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  async function startScanner() {
    setCamError("");
    setStarting(true);
    try {
      // Le geste utilisateur autorise aussi l'audio
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      await audioCtxRef.current?.resume().catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      // Laisse React monter l'élément vidéo
      await new Promise(r => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video) throw new Error("Élément vidéo indisponible");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      const Detector = (window as any).BarcodeDetector;
      if (Detector) {
        const detector = new Detector({ formats: ["qr_code"] });
        setEngine("native");
        startNativeLoop(detector, video);
      } else {
        setEngine("zxing");
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoElement(video, (res) => {
          if (res) handleCode(res.getText());
        });
        zxingControlsRef.current = controls;
      }
    } catch (e: any) {
      console.error(e);
      setScanning(false);
      stopCamera();
      setCamError(
        e?.name === "NotAllowedError"
          ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur."
          : "Impossible de démarrer la caméra sur cet appareil."
      );
    } finally {
      setStarting(false);
    }
  }

  function startNativeLoop(detector: any, video: HTMLVideoElement) {
    let last = 0;
    const loop = async (time: number) => {
      rafRef.current = requestAnimationFrame(loop);
      // ~16 analyses/seconde : assez rapide pour enchaîner les enfants sans épuiser la batterie
      if (time - last < 60) return;
      last = time;
      if (busyRef.current || video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) handleCode(codes[0].rawValue);
      } catch {}
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  // ---------- Traitement d'un code ----------
  const handleCode = useCallback((raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;

    const now = Date.now();
    if (lastScanRef.current[code] && now - lastScanRef.current[code] < RESCAN_DELAY_MS) return;
    lastScanRef.current[code] = now;

    const reg = indexRef.current[code];
    if (!reg) {
      busyRef.current = true;
      beep(240, 0.3);
      navigator.vibrate?.(200);
      setResult({ kind: "inconnu", code });
      resolveInconnu(code);
      return;
    }

    const statut = getMonthStatus(reg, currentMonthStr(), tarifMensuel || undefined);
    const tone = STATUT_UI[statut].tone;

    if (tone === "bad") {
      // On bloque le flux : l'agent doit décider
      busyRef.current = true;
      beep(240, 0.35);
      navigator.vibrate?.([100, 60, 100]);
      setResult({ kind: "ok", reg, statut, pending: true });
    } else {
      beep(880, 0.1);
      navigator.vibrate?.(60);
      setResult({ kind: "ok", reg, statut, pending: false });
      enregistrerPresence(reg, statut, true);
      scheduleDismiss();
    }
    chargerDerniereVenue(code);
  }, [tarifMensuel]);

  async function resolveInconnu(code: string) {
    const { data } = await supabase
      .from("academy_registrations")
      .select("prenom, nom, saison")
      .eq("badge_code", code)
      .order("saison", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setResult({ kind: "autre_saison", nom: `${data[0].prenom} ${data[0].nom}`, saison: data[0].saison || "—" });
    }
  }

  async function chargerDerniereVenue(code: string) {
    const { data } = await supabase
      .from("academy_presences")
      .select("date_presence")
      .eq("badge_code", code)
      .order("date_presence", { ascending: false })
      .limit(1);
    const derniere = data && data.length > 0 ? data[0].date_presence : null;
    setResult(prev => (prev && prev.kind === "ok" && prev.reg.badge_code === code ? { ...prev, derniereVenue: derniere } : prev));
  }

  function enregistrerPresence(reg: ScanRegistration, statut: MonthStatus, autorise: boolean) {
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setJournal(prev => [{ nom: `${reg.prenom} ${reg.nom}`, heure, statut, autorise }, ...prev].slice(0, 30));
    // Écriture optimiste : on n'attend pas le réseau pour libérer le scanner
    supabase.from("academy_presences").insert({
      registration_id: reg.id,
      badge_code: reg.badge_code,
      saison,
      statut_abonnement: statut,
      autorise,
      scanned_by: userEmailRef.current,
    }).then(({ error }) => { if (error) console.error("Présence non enregistrée", error); });
  }

  function scheduleDismiss() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => { setResult(null); busyRef.current = false; }, AUTO_DISMISS_MS);
  }

  function fermerResultat() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setResult(null);
    busyRef.current = false;
  }

  function deciderAcces(autorise: boolean) {
    if (!result || result.kind !== "ok") return;
    enregistrerPresence(result.reg, result.statut, autorise);
    fermerResultat();
  }

  function soumettreManuel(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    delete lastScanRef.current[code];
    handleCode(code);
    setManualCode("");
    setManualOpen(false);
  }

  // ---------- Rendu ----------
  const tone = result?.kind === "ok" ? STATUT_UI[result.statut].tone : result ? "bad" : "ok";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white">Accueil — Scan des badges</h1>
          <p className="mt-1 text-sm text-white/40">
            {loadingData ? "Chargement des inscrits..." : `${registrations.length} enfant(s) — saison ${saison}`}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loadingData}
          title="Recharger la liste des inscrits"
          className="rounded-sm bg-white/5 p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin")} />
        </button>
      </div>

      {/* Zone caméra */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        {!scanning ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fiver-green/10">
              <Camera className="h-7 w-7 text-fiver-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Scanner les cartes des enfants</p>
              <p className="mt-1 text-xs text-white/40">Placez le QR code de la carte devant la caméra.</p>
            </div>
            {camError && (
              <div className="flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {camError}
              </div>
            )}
            <button
              onClick={startScanner}
              disabled={starting || loadingData}
              className="flex items-center gap-2 rounded-lg bg-fiver-green px-8 py-4 text-base font-bold uppercase tracking-wide text-fiver-black disabled:opacity-40"
            >
              {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}
              Démarrer le scan
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-[52vh] w-full bg-black object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-4 border-fiver-green/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-fiver-green">
              {engine === "native" ? "Scan rapide" : "Scan compatible"}
            </div>
            <button
              onClick={() => { stopCamera(); setScanning(false); }}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/70 hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Saisie manuelle de secours */}
      <div>
        {manualOpen ? (
          <form onSubmit={soumettreManuel} className="flex gap-2">
            <input
              autoFocus
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Code de la carte (ex: A7K2M9QP)"
              className="flex-1 rounded-sm border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm uppercase text-white placeholder:text-white/25 focus:border-fiver-green focus:outline-none"
            />
            <button type="submit" className="rounded-sm bg-fiver-green px-5 text-sm font-bold uppercase text-fiver-black">OK</button>
            <button type="button" onClick={() => setManualOpen(false)} className="rounded-sm bg-white/5 px-4 text-white/50">Annuler</button>
          </form>
        ) : (
          <button onClick={() => setManualOpen(true)} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70">
            <KeyRound className="h-3.5 w-3.5" /> Carte abîmée ? Saisir le code à la main
          </button>
        )}
      </div>

      {/* Journal du jour */}
      {journal.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/5">
          <p className="border-b border-white/5 bg-white/[0.02] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Passages de cette session ({journal.length})
          </p>
          <div className="max-h-56 overflow-y-auto">
            {journal.map((j, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-white/5 bg-white/[0.01] px-4 py-2.5">
                <span className="font-mono text-xs text-white/30">{j.heure}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">{j.nom}</span>
                {!j.autorise && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">Refusé</span>}
                {j.statut === "non_paye" && j.autorise && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">Sans abo.</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== RÉSULTAT PLEIN ÉCRAN ====== */}
      {result && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center",
            tone === "ok" ? "bg-[#062b1b]" : tone === "warn" ? "bg-[#3b2a06]" : "bg-[#3b0a0a]"
          )}
        >
          {result.kind === "inconnu" && (
            <>
              <AlertTriangle className="mb-4 h-16 w-16 text-red-400" />
              <p className="font-[var(--font-heading)] text-3xl font-bold uppercase text-white">Carte inconnue</p>
              <p className="mt-2 font-mono text-sm text-white/50">{result.code}</p>
            </>
          )}

          {result.kind === "autre_saison" && (
            <>
              <CalendarClock className="mb-4 h-16 w-16 text-amber-400" />
              <p className="font-[var(--font-heading)] text-3xl font-bold uppercase text-white">Non réinscrit</p>
              <p className="mt-2 text-lg text-white/80">{result.nom}</p>
              <p className="mt-1 text-sm text-white/50">Dernière inscription : saison {result.saison}</p>
            </>
          )}

          {result.kind === "ok" && (
            <>
              <div className="mb-5 h-32 w-32 overflow-hidden rounded-2xl border-2 border-white/20 bg-white/5">
                {result.reg.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.reg.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/30">
                    {result.reg.prenom[0]}{result.reg.nom[0]}
                  </div>
                )}
              </div>

              <p className="font-[var(--font-heading)] text-3xl font-bold uppercase leading-tight text-white">
                {result.reg.prenom} {result.reg.nom}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {result.reg.categorie_foot || "—"}
                {result.reg.centre_loisirs ? " · Loisirs" : ""}
              </p>

              <div className={cn(
                "mt-6 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide",
                tone === "ok" ? "bg-fiver-green text-fiver-black" : tone === "warn" ? "bg-amber-400 text-black" : "bg-red-500 text-white"
              )}>
                {tone === "ok" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {STATUT_UI[result.statut].label}
              </div>

              <p className="mt-3 text-xs text-white/50">
                {result.derniereVenue
                  ? `Dernière venue : ${new Date(result.derniereVenue + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`
                  : result.derniereVenue === null ? "Première venue enregistrée" : ""}
              </p>

              {result.pending && (
                <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                  <button
                    onClick={() => deciderAcces(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white py-5 text-base font-bold uppercase tracking-wide text-black"
                  >
                    <LogIn className="h-5 w-5" /> Laisser passer quand même
                  </button>
                  <button
                    onClick={() => deciderAcces(false)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/25 py-4 text-sm font-bold uppercase tracking-wide text-white/80"
                  >
                    <Ban className="h-4 w-4" /> Refuser l&apos;accès
                  </button>
                </div>
              )}
            </>
          )}

          {(!("pending" in result) || !result.pending) && (
            <button onClick={fermerResultat} className="mt-8 rounded-lg border border-white/25 px-8 py-3 text-sm font-bold uppercase tracking-wide text-white/80">
              Suivant
            </button>
          )}
        </div>
      )}
    </div>
  );
}
