"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type RsvpResult = {
    success?: boolean;
    error?: string;
    /** Client should navigate here — the division picker + payment. */
    redirectTo?: string;
};

// Every event now uses the division-picker form, so the portal RSVP button
// just routes to the full flow. If the member already has a registration,
// send them back to their participation card.
export async function registerForEventAction(eventId: string): Promise<RsvpResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, userId: user.id },
            select: { qrToken: true },
        });
        if (existing) {
            return { redirectTo: `/participants/${existing.qrToken}` };
        }
        return { redirectTo: `/events/${eventId}/register` };
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
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, userId: user.id },
            select: { paymentStatus: true },
        });
        if (existing?.paymentStatus === "PAID") {
            return {
                error: "This is a paid ticket — contact the organisers for a refund or cancellation.",
            };
        }

        await prisma.eventRegistration.deleteMany({
            where: { eventId, userId: user.id },
        });
        revalidatePath("/portal/events");
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Cancellation failed.";
        return { error: message };
    }
}
