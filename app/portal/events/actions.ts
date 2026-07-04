"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyMembers } from "@/lib/notify";
import {
    checkEligibility,
    loadEventGates,
    loadViewerContext,
} from "@/lib/events/eligibility";

function urlSafeToken(bytes = 18): string {
    return randomBytes(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

type RsvpResult = {
    success?: boolean;
    error?: string;
    /** Client should navigate here (premium payment / full form). */
    redirectTo?: string;
};

export async function registerForEventAction(eventId: string): Promise<RsvpResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, userId: user.id },
            select: { paymentStatus: true, qrToken: true },
        });
        if (existing) {
            if (existing.paymentStatus === "PENDING") {
                // Unpaid premium ticket — resume payment from the card.
                return { redirectTo: `/participants/${existing.qrToken}` };
            }
            return { error: "You are already registered for this event." };
        }

        // Participation gates + premium ticketing.
        const gates = await loadEventGates(eventId);
        if (!gates) return { error: "Event not found." };

        const viewer = await loadViewerContext(user.id);
        const eligibility = checkEligibility(gates, viewer);
        if (!eligibility.ok) {
            return { error: eligibility.reason ?? "You are not eligible for this event." };
        }
        if (
            gates.isPremium ||
            eligibility.needsDateOfBirth ||
            eligibility.needsChildMemberNumber
        ) {
            // Needs the full form (payment and/or extra fields).
            return { redirectTo: `/events/${eventId}/register` };
        }

        // Check capacity
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event?.maxCapacity) {
            const count = await prisma.eventRegistration.count({ where: { eventId } });
            if (count >= event.maxCapacity) return { error: "This event is at full capacity." };
        }

        await prisma.eventRegistration.create({
            data: { eventId, userId: user.id, qrToken: urlSafeToken() },
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
