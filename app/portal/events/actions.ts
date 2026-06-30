"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyMembers } from "@/lib/notify";

function urlSafeToken(bytes = 18): string {
    return randomBytes(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export async function registerForEventAction(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, memberId: user.id },
        });
        if (existing) return { error: "You are already registered for this event." };

        // Check capacity
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event?.maxCapacity) {
            const count = await prisma.eventRegistration.count({ where: { eventId } });
            if (count >= event.maxCapacity) return { error: "This event is at full capacity." };
        }

        await prisma.eventRegistration.create({
            data: { eventId, memberId: user.id, qrToken: urlSafeToken() },
        });

        if (event) {
            await notifyMembers([user.id], {
                title: "You're registered",
                message: `You're confirmed for "${event.title}". We'll remind you before it starts.`,
                type: "EVENT",
                link: "/portal/events",
            });
        }

        revalidatePath("/portal/events");
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Registration failed.";
        return { error: message };
    }
}

export async function cancelEventRegistrationAction(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        await prisma.eventRegistration.deleteMany({
            where: { eventId, memberId: user.id },
        });
        revalidatePath("/portal/events");
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Cancellation failed.";
        return { error: message };
    }
}
