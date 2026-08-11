"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-guard";

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

/**
 * Cancelling an event registration is admin-only. Members and dojo owners
 * cannot cancel their own registration — they must contact an admin. The
 * portal UI does not surface this action for non-admins; the server action
 * itself is guarded here as a second line of defence.
 *
 * When `userId` is omitted, the admin is cancelling their own row (kept for
 * backwards compatibility with the admin's personal event list); when passed,
 * the admin is cancelling on behalf of another member (used from the admin
 * participants panel).
 */
export async function cancelEventRegistrationAction(
    eventId: string,
    userId?: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!(await isAdmin(user.id))) {
        return {
            error:
                "Only an admin can cancel a registration. Please contact the organisers.",
        };
    }

    const targetUserId = userId ?? user.id;

    try {
        await prisma.eventRegistration.deleteMany({
            where: { eventId, userId: targetUserId },
        });
        revalidatePath("/portal/events");
        revalidatePath(`/portal/admin/events/${eventId}/participants`);
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Cancellation failed.";
        return { error: message };
    }
}

/**
 * Admin cancels a single registration row by id. Used from the admin
 * participants panel where the admin already knows the registrationId.
 */
export async function cancelRegistrationByIdAction(registrationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!(await isAdmin(user.id))) {
        return { error: "Only an admin can cancel a registration." };
    }

    try {
        const row = await prisma.eventRegistration.findUnique({
            where: { id: registrationId },
            select: { eventId: true },
        });
        if (!row) return { error: "Registration not found." };

        await prisma.eventRegistration.delete({
            where: { id: registrationId },
        });
        revalidatePath("/portal/events");
        revalidatePath(`/portal/admin/events/${row.eventId}/participants`);
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Cancellation failed.";
        return { error: message };
    }
}
