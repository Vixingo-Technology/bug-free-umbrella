"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { notifyMembers } from "@/lib/notify";
import { getFees } from "@/lib/settings/fees";
import { calculatePastBeltFee } from "@/lib/joining";
import { BELT_RANKS_ORDERED } from "@/lib/constants";

/**
 * Accept a student's join request and confirm their rank.
 * - If assignedRank == White Belt → student is JOINED immediately.
 * - Otherwise → student moves to PAST_BELT_UNPAID with the fee calculated
 *   from the flat per-rank amount in SystemSettings.
 * Notifies the student in both cases; owner notification for the JOINED
 * completion is sent from the past-belt payment webhook (or here, if
 * White Belt short-circuits the past-belt step).
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

    const isWhite = assignedRank === "White Belt";
    const { pastBeltFeePerRankBDT } = await getFees();
    const fee = isWhite ? 0 : calculatePastBeltFee(assignedRank, pastBeltFeePerRankBDT);

    await prisma.$transaction(async (tx) => {
        await tx.student.update({
            where: { id: studentId },
            data: {
                assignedRank,
                pastBeltFeeBDT: fee > 0 ? fee : null,
                joinStage: isWhite ? "JOINED" : "PAST_BELT_UNPAID",
                joinedAt: isWhite ? new Date() : null,
                currentRank: isWhite ? "White Belt" : undefined,
            },
        });

        // Student notifications
        if (isWhite) {
            await notifyMembers(
                [studentId],
                {
                    title: "You've joined JKA Bangladesh",
                    message:
                        "Your dojo has accepted your join request. Welcome — full portal access is unlocked.",
                    type: "INFO",
                    link: "/portal",
                },
                tx,
            );
            // Owner echo — "Student joined successfully"
            await notifyMembers(
                [user.id],
                {
                    title: "Student joined successfully",
                    message: `${student.user.fullName} has completed joining at White Belt.`,
                    type: "INFO",
                    link: "/portal/dojo/join-requests",
                },
                tx,
            );
        } else {
            await notifyMembers(
                [studentId],
                {
                    title: "Dojo accepted your join request",
                    message: `Your rank is confirmed as ${assignedRank}. Please pay the past-belt fee (৳${fee.toLocaleString()}) to finish joining.`,
                    type: "INFO",
                    link: "/portal/joining",
                },
                tx,
            );
        }
    });

    revalidatePath("/portal/dojo/join-requests");
    revalidatePath("/portal/joining");
    return { success: true };
}
