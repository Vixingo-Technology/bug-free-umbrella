"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { assignDojo } from "@/lib/auth/assign-dojo";
import { notifyAdmins, notifyMembers } from "@/lib/notify";

async function requireDojoOwner(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." as const };

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "DOJO_OWNER" || !current.dojoId) {
        return { error: "Only the dojo owner can act on transfer requests." as const };
    }

    const req = await prisma.studentTransferRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            fromDojoId: true,
            toDojoId: true,
            studentId: true,
            student: { select: { user: { select: { fullName: true } } } },
            fromDojo: { select: { name: true } },
            toDojo: { select: { name: true } },
        },
    });
    if (!req) return { error: "Not found." as const };
    if (req.fromDojoId !== current.dojoId) {
        return { error: "This request is not for your dojo." as const };
    }
    if (req.status !== "AWAITING_DOJO") {
        return { error: "This request is no longer awaiting your clearance." as const };
    }

    return { user, current, req };
}

export async function approveClearanceAction(
    requestId: string,
    note?: string,
): Promise<{ error?: string } | void> {
    const guard = await requireDojoOwner(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    await prisma.$transaction(async (tx) => {
        await tx.studentTransferRequest.update({
            where: { id: requestId },
            data: {
                dojoDecision: "APPROVED",
                dojoNote: note?.trim() || null,
                dojoActedAt: new Date(),
                dojoActedById: user.id,
                status: "AWAITING_ADMIN",
            },
        });

        await notifyAdmins(
            {
                title: "Transfer request cleared by dojo",
                message: `${req.student.user.fullName} — ${req.fromDojo.name} → ${req.toDojo.name}. Awaiting admin approval.`,
                type: "TRANSFER",
                link: `/portal/admin/transfers`,
            },
            tx,
        );

        await notifyMembers(
            [req.studentId],
            {
                title: "Dojo clearance received",
                message: `Your current dojo has cleared your transfer request. Awaiting JKA admin approval.`,
                type: "TRANSFER",
                link: `/portal/transfer`,
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/transfers");
}

async function requireNewDojoOwner(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." as const };

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "DOJO_OWNER" || !current.dojoId) {
        return { error: "Only the dojo owner can act on join requests." as const };
    }

    const req = await prisma.studentTransferRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            fromDojoId: true,
            toDojoId: true,
            studentId: true,
            student: { select: { user: { select: { fullName: true } } } },
            fromDojo: { select: { name: true } },
            toDojo: { select: { name: true } },
        },
    });
    if (!req) return { error: "Not found." as const };
    if (req.toDojoId !== current.dojoId) {
        return { error: "This join request is not for your dojo." as const };
    }
    if (req.status !== "AWAITING_NEW_DOJO") {
        return { error: "This request is not awaiting your acceptance." as const };
    }

    return { user, current, req };
}

export async function acceptJoinRequestAction(
    requestId: string,
    rank: string,
    note?: string,
): Promise<{ error?: string } | void> {
    if (!rank?.trim()) return { error: "Please select a rank for this student." };

    const guard = await requireNewDojoOwner(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    const rankRow = await prisma.beltRank.findUnique({
        where: { name: rank.trim() },
        select: { name: true },
    });
    if (!rankRow) return { error: "Selected rank is not valid." };

    await prisma.$transaction(async (tx) => {
        await assignDojo(req.studentId, req.toDojoId, {
            changedById: user.id,
            reason: "Transfer accepted by new dojo",
            transferRequestId: req.id,
            tx,
        });

        await tx.student.update({
            where: { id: req.studentId },
            data: { currentRank: rankRow.name },
        });

        await tx.studentTransferRequest.update({
            where: { id: req.id },
            data: {
                status: "APPROVED",
                assignedRank: rankRow.name,
                dojoNote: req.status === "AWAITING_NEW_DOJO" && note?.trim() ? note.trim() : undefined,
                newDojoActedAt: new Date(),
                newDojoActedById: user.id,
            },
        });

        await notifyMembers(
            [req.studentId],
            {
                title: "Welcome to your new dojo",
                message: `${req.toDojo.name} accepted your join request. Your rank has been set to ${rankRow.name}.`,
                type: "TRANSFER",
                link: `/portal/transfer`,
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/transfers");
    revalidatePath("/portal/transfer");
}

export async function rejectClearanceAction(
    requestId: string,
    note: string,
): Promise<{ error?: string } | void> {
    if (!note?.trim()) return { error: "A rejection note is required." };

    const guard = await requireDojoOwner(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    await prisma.$transaction(async (tx) => {
        await tx.studentTransferRequest.update({
            where: { id: requestId },
            data: {
                dojoDecision: "REJECTED",
                dojoNote: note.trim(),
                dojoActedAt: new Date(),
                dojoActedById: user.id,
                status: "AWAITING_ADMIN",
            },
        });

        await notifyAdmins(
            {
                title: "Transfer request rejected by dojo",
                message: `${req.student.user.fullName} — ${req.fromDojo.name} → ${req.toDojo.name}. Dojo rejected: "${note.trim()}". Admin can override.`,
                type: "TRANSFER",
                link: `/portal/admin/transfers`,
            },
            tx,
        );

        await notifyMembers(
            [req.studentId],
            {
                title: "Dojo clearance denied",
                message: `Your current dojo did not clear your transfer request. JKA admin will review it.`,
                type: "TRANSFER",
                link: `/portal/transfer`,
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/transfers");
}
