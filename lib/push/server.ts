import webpush, { type PushSubscription as WebPushSubscription, type WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/prisma/generated/client";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@jkabangladesh.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  link?: string | null;
  tag?: string | null;
  type?: NotificationType;
};

/**
 * Fan out a push payload to every subscription belonging to any of the
 * given user ids. Silent no-op if VAPID isn't configured — realtime +
 * in-app bell still work; push is a progressive enhancement.
 * Expired / gone endpoints (404/410) are pruned automatically.
 * Failures are swallowed so a bad browser can't break the caller.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configure()) return;
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: unique } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    link: payload.link ?? "/portal/notifications",
    tag: payload.tag ?? undefined,
    type: payload.type ?? "INFO",
  });

  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      const sub: WebPushSubscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(sub, body, { TTL: 60 * 60 * 24 });
      } catch (err) {
        const status = (err as WebPushError)?.statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
        // else: transient — log server-side but don't rethrow
        else console.warn("[push] send failed", { endpoint: s.endpoint, status });
      }
    })
  );

  if (dead.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  }
}
