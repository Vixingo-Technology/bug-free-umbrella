"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { notifyMembers } from "@/lib/notify";

async function loadRequest(requestId: string) {
    return prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            studentId: true,
            serviceId: true,
            payload: true,
            service: { select: { name: true, slug: true, handler: true } },
            student: { select: { user: { select: { fullName: true } } } },
        },
    });
}

/**
 * Admin approves the request. Kyu/Dan conversion sets the student's
 * currentRank + assignedRank to the requested value.
 */
export async function approveServiceByAdminAction(
    requestId: string,
    note?: string,
): Promise<{ error?: string } | void> {
    await requireAdmin();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const req = await loadRequest(requestId);
    if (!req) return { error: "Not found." };
    if (req.status !== "AWAITING_ADMIN") {
        return { error: "This request is not awaiting admin approval." };
    }

    await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
            where: { id: requestId },
            data: {
                status: "APPROVED",
                adminNote: note?.trim() || null,
                adminActedAt: new Date(),
                adminActedById: user.id,
            },
        });

        // Apply the side-effect of the service.
        if (req.service.handler === "kyu-dan-conversion") {
            const rank = (req.payload as { requestedRank?: string } | null)?.requestedRank;
            if (rank) {
                await tx.student.update({
                    where: { id: req.studentId },
                    data: { currentRank: rank, assignedRank: rank },
                });
            }
        }

        await notifyMembers(
            [req.studentId],
            {
                title: `${req.service.name} — approved`,
                message: `JKA HQ approved your request.`,
                type: "SERVICE",
                link: `/portal/services/${req.service.slug}`,
            },
            tx,
        );
    });

    revalidatePath("/portal/admin/service-requests");
}

export async function denyServiceByAdminAction(
    requestId: string,
    note: string,
): Promise<{ error?: string } | void> {
    if (!note?.trim()) return { error: "A denial note is required." };
    await requireAdmin();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const req = await loadRequest(requestId);
    if (!req) return { error: "Not found." };
    if (req.status !== "AWAITING_ADMIN") {
        return { error: "This request is not awaiting admin approval." };
    }

    await prisma.$transaction(async (tx) => {
        await tx.serviceRequest.update({
            where: { id: requestId },
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
                title: `${req.service.name} — denied`,
                message: `JKA HQ did not approve your request. Note: "${note.trim()}"`,
                type: "SERVICE",
                link: `/portal/services/${req.service.slug}`,
            },
            tx,
        );
    });

    revalidatePath("/portal/admin/service-requests");
}
