"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function registerForEventAction(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const existing = await prisma.eventRegistration.findUnique({
            where: { eventId_memberId: { eventId, memberId: user.id } },
        });
        if (existing) return { error: "You are already registered for this event." };

        // Check capacity
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event?.maxCapacity) {
            const count = await prisma.eventRegistration.count({ where: { eventId } });
            if (count >= event.maxCapacity) return { error: "This event is at full capacity." };
        }

        await prisma.eventRegistration.create({
            data: { eventId, memberId: user.id },
        });

        revalidatePath("/portal/events");
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Registration failed." };
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
    } catch (err: any) {
        return { error: err?.message ?? "Cancellation failed." };
    }
}
