"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { loadTransferService } from "@/lib/settings/transfer-fee";
import { previewCoupon } from "@/lib/services/coupon";
import { notifyMembers } from "@/lib/notify";
import { findUserIdsByRoles } from "@/lib/notify/recipients";

const OPEN_STATUSES = ["PENDING_PAYMENT", "AWAITING_DOJO", "AWAITING_ADMIN", "AWAITING_NEW_DOJO"] as const;

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
    couponCode?: string;
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

    // Fee & coupon scope both come from the `transfer-dojo` Service row
    // so admin edits on the services page take effect immediately.
    const { fee: transferFeeBDT, serviceId: transferServiceId } =
        await loadTransferService();

    let discountAmount = 0;
    let finalAmount = transferFeeBDT;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (input.couponCode?.trim() && transferServiceId) {
        const check = await previewCoupon({
            code: input.couponCode,
            studentDojoId: student.dojoId!,
            serviceId: transferServiceId,
            fee: transferFeeBDT,
        });
        if ("error" in check) return { error: check.error };
        discountAmount = check.preview.discountAmount;
        finalAmount = check.preview.finalAmount;
        couponId = check.preview.id;
        couponCode = check.preview.code;
    }

    const isFree = finalAmount <= 0;

    let orderId: string;
    let requestId: string;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.studentTransferRequest.create({
                data: {
                    studentId: user.id,
                    fromDojoId: student.dojoId!,
                    toDojoId,
                    reason: input.reason?.trim() || null,
                    fee: transferFeeBDT,
                    discountAmount,
                    finalAmount,
                    couponCode,
                    status: isFree ? "AWAITING_DOJO" : "PENDING_PAYMENT",
                    paidAt: isFree ? new Date() : null,
                },
            });

            const order = await tx.shopOrder.create({
                data: {
                    userId: user.id,
                    total: finalAmount,
                    paymentStatus: isFree ? "PAID" : "PENDING",
                    includesTransferRequest: true,
                    notes: `Transfer request fee`,
                },
            });

            await tx.studentTransferRequest.update({
                where: { id: request.id },
                data: { orderId: order.id },
            });

            if (couponId) {
                await tx.serviceCoupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }

            return { orderId: order.id, requestId: request.id };
        });
        orderId = result.orderId;
        requestId = result.requestId;
    } catch (err: any) {
        return { error: err?.message ?? "Failed to create transfer request." };
    }

    revalidatePath("/portal/transfer");

    if (isFree) {
        // Skip the gateway — mirror the webhook's side-effects for a paid
        // transfer so the dojo owner is alerted immediately.
        const ownerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: student.dojoId! });
        if (ownerIds.length) {
            await notifyMembers(ownerIds, {
                title: "Transfer request pending your clearance",
                message: "A student has requested a transfer from your dojo.",
                type: "TRANSFER",
                link: "/portal/dojo/transfers",
            });
        }
        await notifyMembers([user.id], {
            title: "Transfer request submitted (coupon applied)",
            message: "Your coupon covered the transfer fee. Awaiting clearance from your dojo.",
            type: "TRANSFER",
            link: "/portal/transfer",
        });
        redirect(`/portal/transfer?status=success&requestId=${requestId}&free=1`);
    }

    redirect(`/portal/checkout?orderId=${orderId}`);
}

export async function previewTransferCouponAction(couponCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const current = await loadCurrentUser(user.id);
    if (!current?.dojoId) return { error: "No dojo assignment." };

    const { fee: transferFeeBDT, serviceId: transferServiceId } =
        await loadTransferService();
    if (!transferServiceId) {
        return { error: "Coupons are not available for transfers yet." };
    }

    const check = await previewCoupon({
        code: couponCode,
        studentDojoId: current.dojoId,
        serviceId: transferServiceId,
        fee: transferFeeBDT,
    });
    if ("error" in check) return { error: check.error };
    return { preview: check.preview };
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
