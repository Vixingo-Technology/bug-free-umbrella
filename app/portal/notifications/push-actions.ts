"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const MAX_UA_LEN = 512;

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { error: "Invalid subscription payload." };
  }

  const userAgent = input.userAgent ? input.userAgent.slice(0, MAX_UA_LEN) : null;

  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent,
    },
    update: {
      userId: user.id,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent,
    },
  });

  return { success: true };
}

export async function deletePushSubscriptionAction(input: { endpoint: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (!input.endpoint) return { error: "Missing endpoint." };

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: input.endpoint, userId: user.id },
  });

  return { success: true };
}

export async function getPushStateAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { subscribed: false };

  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  return { subscribed: count > 0, count };
}
