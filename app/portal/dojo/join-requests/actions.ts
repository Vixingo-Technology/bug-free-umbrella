"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { notifyMembers } from "@/lib/notify";
import { BELT_RANKS_ORDERED } from "@/lib/constants";

/**
 * Accept a student's join request and confirm their rank. The student
 * moves straight to JOINED; any past-rank conversion is now handled
 * separately from /portal/services/kyu-dan-conversion.
 */
export async function acceptJoinRequestAction(
    studentId: string,
    assignedRank: string,
): Promise<{ error?: string; success?: true }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!BELT_RANKS_ORDERED.includes(assignedRank as (typeof BELT_RANKS_ORDERED)[number])) {
        return { error: "Unknown rank." };
    }

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "DOJO_OWNER" || !current.dojoId) {
        return { error: "Only the dojo owner can accept join requests." };
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
            joinStage: true,
            dojoId: true,
            user: { select: { fullName: true } },
        },
    });
    if (!student) return { error: "Student not found." };
    if (student.dojoId !== current.dojoId) {
        return { error: "This student is not registered with your dojo." };
    }
    if (student.joinStage !== "AWAITING_APPROVAL") {
        return { error: "This request is no longer awaiting approval." };
    }

    await prisma.$transaction(async (tx) => {
        await tx.student.update({
            where: { id: studentId },
            data: {
                assignedRank,
                pastBeltFeeBDT: null,
                joinStage: "JOINED",
                joinedAt: new Date(),
                currentRank: assignedRank,
            },
        });

        await notifyMembers(
            [studentId],
            {
                title: "You've joined JKA Bangladesh",
                message: `Your dojo has accepted your join request at ${assignedRank}. Welcome — full portal access is unlocked.`,
                type: "INFO",
                link: "/portal",
            },
            tx,
        );
        await notifyMembers(
            [user.id],
            {
                title: "Student joined successfully",
                message: `${student.user.fullName} has completed joining at ${assignedRank}.`,
                type: "INFO",
                link: "/portal/dojo/join-requests",
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/join-requests");
    revalidatePath("/portal/joining");
    return { success: true };
}
