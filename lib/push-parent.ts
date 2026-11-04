import { appelParent } from "@/lib/parents";

// Notifications sur le téléphone du parent (Web Push) : abonnement depuis l'Espace Parents.

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export type EtatPush = "indisponible" | "iphone_a_installer" | "refuse" | "a_activer" | "actif";

function cleEnOctets(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(b);
  return Uint8Array.from([...brut].map(c => c.charCodeAt(0)));
}

const estIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const estInstalle = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export async function etatPush(): Promise<EtatPush> {
  if (typeof window === "undefined" || !CLE_PUBLIQUE) return "indisponible";
  // Sur iPhone, les notifications ne marchent qu'une fois le site ajouté à l'écran d'accueil
  if (estIos() && !estInstalle()) return "iphone_a_installer";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "indisponible";
  if (Notification.permission === "denied") return "refuse";
  const reg = await navigator.serviceWorker.getRegistration("/sw-parents.js").catch(() => undefined);
  const abonnement = await reg?.pushManager.getSubscription().catch(() => null);
  return abonnement && Notification.permission === "granted" ? "actif" : "a_activer";
}

export async function activerPush(): Promise<EtatPush> {
  const reg = await navigator.serviceWorker.register("/sw-parents.js");
  await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "refuse" : "a_activer";
  const abonnement = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(CLE_PUBLIQUE) });
  await appelParent("parent_enregistrer_push", { p_abonnement: abonnement.toJSON() });
  return "actif";
}

export async function desactiverPush(): Promise<EtatPush> {
  const reg = await navigator.serviceWorker.getRegistration("/sw-parents.js");
  const abonnement = await reg?.pushManager.getSubscription();
  if (abonnement) {
    await appelParent("parent_supprimer_push", { p_endpoint: abonnement.endpoint }).catch(() => {});
    await abonnement.unsubscribe();
  }
  return "a_activer";
}
