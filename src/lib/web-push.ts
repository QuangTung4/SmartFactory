import { api } from "@/lib/api";
import { getSession } from "@/lib/auth-store";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Register Web Push when VAPID is configured on the API. */
export async function registerWebPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const session = getSession();
  if (!session?.userId) return false;

  try {
    const { publicKey } = await api.pushVapidPublicKey();
    const reg = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = sub.toJSON();
    await api.registerPush({
      userId: session.userId,
      platform: "web",
      token: json.endpoint || sub.endpoint,
      endpoint: json.endpoint || sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    });
    return true;
  } catch (err) {
    console.info("[web-push] skip:", err);
    return false;
  }
}
