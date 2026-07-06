"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { assignDojo } from "@/lib/auth/assign-dojo";
import { findUserIdsByRoles } from "@/lib/notify/recipients";
import { notifyMembers } from "@/lib/notify";

async function requireAdmin(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." as const };

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "ADMIN") {
        return { error: "Admin only." as const };
    }

    const req = await prisma.studentTransferRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            studentId: true,
            fromDojoId: true,
            toDojoId: true,
            fromDojo: { select: { name: true } },
            toDojo:   { select: { name: true } },
            student:  { select: { user: { select: { fullName: true } } } },
        },
    });
    if (!req) return { error: "Not found." as const };
    if (req.status !== "AWAITING_ADMIN") {
        return { error: "This request is not awaiting admin action." as const };
    }

    return { user, req };
}

export async function approveTransferAction(
    requestId: string,
    note?: string,
): Promise<{ error?: string } | void> {
    const guard = await requireAdmin(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    const newDojoOwnerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: req.toDojoId });

    await prisma.$transaction(async (tx) => {
        await assignDojo(req.studentId, req.toDojoId, {
            changedById: user.id,
            reason: "Transfer approved",
            transferRequestId: req.id,
            tx,
        });

        await tx.studentTransferRequest.update({
            where: { id: req.id },
            data: {
                status: "APPROVED",
                adminNote: note?.trim() || null,
                adminActedAt: new Date(),
                adminActedById: user.id,
            },
        });

        await notifyMembers(
            [req.studentId],
            {
                title: "Transfer approved",
                message: `Your transfer request has been approved. You are now a member of ${req.toDojo.name}.`,
                type: "TRANSFER",
                link: `/portal/transfer`,
            },
            tx,
        );

        await notifyMembers(
            newDojoOwnerIds,
            {
                title: "New student transferred in",
                message: `JKA admin transferred ${req.student.user.fullName} from ${req.fromDojo.name} to your dojo.`,
                type: "TRANSFER",
                link: `/portal/dojo/transfers`,
            },
            tx,
        );
    });

    revalidatePath("/portal/admin/transfers");
    revalidatePath("/portal/transfer");
    revalidatePath("/portal/dojo/transfers");
}

export async function denyTransferAction(
    requestId: string,
    note: string,
): Promise<{ error?: string } | void> {
    if (!note?.trim()) return { error: "A reason is required." };

    const guard = await requireAdmin(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    await prisma.$transaction(async (tx) => {
        await tx.studentTransferRequest.update({
            where: { id: req.id },
            data: {
                status: "DENIED",
                adminNote: note.trim(),
                adminActedAt: new Date(),
                adminActedById: user.id,
            },
        });

        await notifyMembers(
            [req.studentId],
            {
                title: "Transfer request denied",
                message: `JKA admin denied your transfer request: "${note.trim()}"`,
                type: "TRANSFER",
                link: `/portal/transfer`,
            },
            tx,
        );
    });

    revalidatePath("/portal/admin/transfers");
    revalidatePath("/portal/transfer");
}
