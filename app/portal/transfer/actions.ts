"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { getFees } from "@/lib/settings/fees";

const OPEN_STATUSES = ["PENDING_PAYMENT", "AWAITING_DOJO", "AWAITING_ADMIN"] as const;

/** Sweep away any orphaned PENDING_PAYMENT rows older than 30 minutes. */
async function sweepStaleRequests(studentId: string) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.studentTransferRequest.updateMany({
        where: {
            studentId,
            status: "PENDING_PAYMENT",
            createdAt: { lt: cutoff },
        },
        data: { status: "CANCELLED" },
    });
}

export async function createTransferRequestAction(input: {
    toDojoId: string;
    reason?: string;
}): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "STUDENT") {
        return { error: "Only students can request a transfer." };
    }
    if (!current.dojoId) {
        return { error: "You are not assigned to a dojo. Contact JKA admin." };
    }

    const student = await prisma.student.findUnique({
        where: { id: user.id },
        select: { membershipStatus: true, dojoId: true },
    });
    if (!student || student.membershipStatus !== "ACTIVE") {
        return { error: "An active membership is required to request a transfer." };
    }

    const toDojoId = input.toDojoId?.trim();
    if (!toDojoId) return { error: "Please select a target dojo." };
    if (toDojoId === student.dojoId) {
        return { error: "You are already a member of that dojo." };
    }

    const toDojo = await prisma.dojo.findUnique({
        where: { id: toDojoId },
        select: { id: true, isActive: true },
    });
    if (!toDojo || !toDojo.isActive) {
        return { error: "The selected dojo is not accepting transfers." };
    }

    await sweepStaleRequests(user.id);

    const existing = await prisma.studentTransferRequest.findFirst({
        where: { studentId: user.id, status: { in: [...OPEN_STATUSES] } },
        select: { id: true },
    });
    if (existing) {
        return { error: "You already have an open transfer request." };
    }

    const { transferFeeBDT } = await getFees();

    let orderId: string;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.studentTransferRequest.create({
                data: {
                    studentId: user.id,
                    fromDojoId: student.dojoId!,
                    toDojoId,
                    reason: input.reason?.trim() || null,
                    fee: transferFeeBDT,
                    status: "PENDING_PAYMENT",
                },
            });

            const order = await tx.shopOrder.create({
                data: {
                    userId: user.id,
                    total: transferFeeBDT,
                    paymentStatus: "PENDING",
                    includesTransferRequest: true,
                    notes: `Transfer request fee`,
                },
            });

            await tx.studentTransferRequest.update({
                where: { id: request.id },
                data: { orderId: order.id },
            });

            return { orderId: order.id };
        });
        orderId = result.orderId;
    } catch (err: any) {
        return { error: err?.message ?? "Failed to create transfer request." };
    }

    revalidatePath("/portal/transfer");
    redirect(`/portal/checkout?orderId=${orderId}`);
}

export async function cancelPendingTransferAction(requestId: string): Promise<{ error?: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const req = await prisma.studentTransferRequest.findUnique({
        where: { id: requestId },
        select: { studentId: true, status: true },
    });
    if (!req || req.studentId !== user.id) return { error: "Not found." };
    if (req.status !== "PENDING_PAYMENT") {
        return { error: "This request can no longer be cancelled." };
    }

    await prisma.studentTransferRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
    });
    revalidatePath("/portal/transfer");
}
