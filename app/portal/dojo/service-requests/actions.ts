"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { notifyAdmins, notifyMembers } from "@/lib/notify";

async function requireDojoActor(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." as const };

    const current = await loadCurrentUser(user.id);
    if (
        !current ||
        (current.role !== "DOJO_OWNER" && current.role !== "DOJO_MANAGER") ||
        !current.dojoId
    ) {
        return { error: "Only dojo staff can act on service requests." as const };
    }

    const req = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            dojoId: true,
            studentId: true,
            service: { select: { name: true } },
            student: { select: { user: { select: { fullName: true } } } },
        },
    });
    if (!req) return { error: "Not found." as const };
    if (req.dojoId !== current.dojoId) {
        return { error: "This request is not for your dojo." as const };
    }
    if (req.status !== "AWAITING_DOJO") {
        return { error: "This request is no longer awaiting dojo action." as const };
    }

    return { user, current, req };
}

export async function approveServiceByDojoAction(
    requestId: string,
    note?: string,
): Promise<{ error?: string } | void> {
    const guard = await requireDojoActor(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
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
                title: `${req.service.name} — cleared by dojo`,
                message: `${req.student.user.fullName}. Awaiting JKA HQ approval.`,
                type: "SERVICE",
                link: "/portal/admin/service-requests",
            },
            tx,
        );

        await notifyMembers(
            [req.studentId],
            {
                title: "Dojo cleared your service request",
                message: `Your dojo approved your ${req.service.name} request. It's now with JKA HQ.`,
                type: "SERVICE",
                link: "/portal/services",
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/service-requests");
}

export async function rejectServiceByDojoAction(
    requestId: string,
    note: string,
): Promise<{ error?: string } | void> {
    if (!note?.trim()) return { error: "A rejection note is required." };

    const guard = await requireDojoActor(requestId);
    if ("error" in guard) return guard;
    const { user, req } = guard;

    await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
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
                title: `${req.service.name} — rejected by dojo`,
                message: `${req.student.user.fullName}. Dojo note: "${note.trim()}". Admin can override.`,
                type: "SERVICE",
                link: "/portal/admin/service-requests",
            },
            tx,
        );

        await notifyMembers(
            [req.studentId],
            {
                title: "Dojo did not clear your service request",
                message: `Your dojo did not approve your ${req.service.name} request. JKA HQ will review it.`,
                type: "SERVICE",
                link: "/portal/services",
            },
            tx,
        );
    });

    revalidatePath("/portal/dojo/service-requests");
}
