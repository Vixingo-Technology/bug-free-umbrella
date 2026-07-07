"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function loadMoreNotificationsAction(skip: number, take: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated.", notifications: [] as any[] };

    const safeTake = Math.min(Math.max(take, 1), 50);
    const safeSkip = Math.max(skip, 0);

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: safeSkip,
        take: safeTake,
    });

    return { success: true, notifications };
}

export async function markNotificationReadAction(notificationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    await prisma.notification.updateMany({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true },
    });

    revalidatePath("/portal/notifications");
    return { success: true };
}

export async function markAllReadAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
    });

    revalidatePath("/portal/notifications");
    revalidatePath("/portal");
    return { success: true };
}
