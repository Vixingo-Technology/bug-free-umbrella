// Web Push client helpers. Called from the portal shell / bell so the
// browser registers the service worker, asks for Notification permission,
// and posts the resulting subscription to a server action.

import { savePushSubscriptionAction, deletePushSubscriptionAction } from "@/app/portal/notifications/push-actions";

const SW_PATH = "/sw.js";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

/**
 * Ask the browser for Notification permission and register a push
 * subscription. Persists the subscription server-side. Returns the
 * final permission state so the caller can update UI.
 */
export async function enablePush(): Promise<{
  permission: NotificationPermission;
  ok: boolean;
  error?: string;
}> {
  if (!isPushSupported()) return { permission: "denied", ok: false, error: "Push not supported in this browser." };

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return { permission: pushPermission(), ok: false, error: "VAPID public key not configured." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { permission, ok: false };

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";
  if (!p256dh || !auth) return { permission, ok: false, error: "Subscription keys missing." };

  const result = await savePushSubscriptionAction({
    endpoint,
    p256dh,
    auth,
    userAgent: navigator.userAgent,
  });

  if (result?.error) return { permission, ok: false, error: result.error };
  return { permission, ok: true };
}

/** Unsubscribe locally + remove from the server. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await deletePushSubscriptionAction({ endpoint });
}
