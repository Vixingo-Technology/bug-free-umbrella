"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function applyForGradingAction(gradingEventId: string, notes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    try {
        // Check if already applied for this specific event
        const existing = await prisma.gradingApplication.findFirst({
            where: { memberId: user.id, gradingEventId },
        });

        if (existing) return { error: "You have already applied for this grading exam." };

        // Fetch the event to get target rank
        const event = await prisma.gradingEvent.findUnique({
            where: { id: gradingEventId },
        });

        await prisma.gradingApplication.create({
            data: {
                memberId: user.id,
                gradingEventId,
                targetRankId: event?.targetRankId ?? null,
                status: "SUBMITTED",
                notes: notes || null,
            },
        });

        revalidatePath("/portal/grading");
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to submit application." };
    }
}

export async function withdrawApplicationAction(applicationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    try {
        await prisma.gradingApplication.deleteMany({
            where: { id: applicationId, memberId: user.id },
        });

        revalidatePath("/portal/grading");
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to withdraw application." };
    }
}
