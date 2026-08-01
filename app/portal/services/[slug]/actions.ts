"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { previewCoupon } from "@/lib/services/coupon";
import { notifyMembers } from "@/lib/notify";
import { findUserIdsByRoles } from "@/lib/notify/recipients";

const OPEN_STATUSES = ["PENDING_PAYMENT", "AWAITING_DOJO", "AWAITING_ADMIN"] as const;

async function sweepStale(studentId: string, serviceId: string) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.serviceRequest.updateMany({
        where: {
            studentId,
            serviceId,
            status: "PENDING_PAYMENT",
            createdAt: { lt: cutoff },
        },
        data: { status: "CANCELLED" },
    });
}

/**
 * Create a service request. If the coupon covers 100% the order is created
 * pre-paid, no gateway trip is made, and the request advances straight to
 * AWAITING_DOJO. Otherwise the buyer lands on the checkout page.
 */
export async function createServiceRequestAction(input: {
    serviceSlug: string;
    payload?: Record<string, unknown>;
    reason?: string;
    couponCode?: string;
}): Promise<{ error: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "STUDENT" || !current.dojoId) {
        return { error: "Only students in a dojo can request services." };
    }

    const student = await prisma.student.findUnique({
        where: { id: user.id },
        select: { membershipStatus: true, dojoId: true },
    });
    if (!student || student.membershipStatus !== "ACTIVE" || !student.dojoId) {
        return { error: "An active membership is required to request a service." };
    }

    const service = await prisma.service.findUnique({
        where: { slug: input.serviceSlug },
    });
    if (!service || !service.isActive) {
        return { error: "That service is not available." };
    }

    await sweepStale(user.id, service.id);

    const existing = await prisma.serviceRequest.findFirst({
        where: {
            studentId: user.id,
            serviceId: service.id,
            status: { in: [...OPEN_STATUSES] },
        },
        select: { id: true },
    });
    if (existing) {
        return { error: "You already have an open request for this service." };
    }

    const fee = Number(service.feeBDT);
    let discountAmount = 0;
    let finalAmount = fee;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (input.couponCode?.trim()) {
        const check = await previewCoupon({
            code: input.couponCode,
            studentDojoId: student.dojoId,
            serviceId: service.id,
            fee,
        });
        if ("error" in check) return { error: check.error };
        discountAmount = check.preview.discountAmount;
        finalAmount = check.preview.finalAmount;
        couponId = check.preview.id;
        couponCode = check.preview.code;
    }

    const isFree = finalAmount <= 0;

    let orderId: string;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.shopOrder.create({
                data: {
                    userId: user.id,
                    total: finalAmount,
                    paymentStatus: isFree ? "PAID" : "PENDING",
                    includesServiceRequest: true,
                    notes: `${service.name} service request`,
                },
            });

            const req = await tx.serviceRequest.create({
                data: {
                    studentId: user.id,
                    serviceId: service.id,
                    dojoId: student.dojoId!,
                    payload: (input.payload as never) ?? {},
                    reason: input.reason?.trim() || null,
                    fee,
                    discountAmount,
                    finalAmount,
                    couponId,
                    couponCode,
                    orderId: order.id,
                    status: isFree ? "AWAITING_DOJO" : "PENDING_PAYMENT",
                    paidAt: isFree ? new Date() : null,
                },
            });

            if (couponId) {
                await tx.serviceCoupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }

            if (isFree) {
                // Notify dojo owner + managers so they can act on the request.
                const dojoActors = await findUserIdsByRoles(
                    ["DOJO_OWNER", "DOJO_MANAGER"],
                    { dojoId: student.dojoId! },
                );
                if (dojoActors.length) {
                    await notifyMembers(
                        dojoActors,
                        {
                            title: `${service.name} — new request`,
                            message: "A student in your dojo submitted a service request. Please review.",
                            type: "SERVICE",
                            link: "/portal/dojo/service-requests",
                        },
                        tx,
                    );
                }
            }

            return { orderId: order.id, requestId: req.id };
        });
        orderId = result.orderId;
    } catch (err: any) {
        return { error: err?.message ?? "Failed to create service request." };
    }

    revalidatePath(`/portal/services/${service.slug}`);

    if (isFree) {
        redirect(`/portal/services/${service.slug}?status=success&free=1`);
    }
    redirect(`/portal/checkout?orderId=${orderId}`);
}

export async function cancelServiceRequestAction(requestId: string): Promise<{ error?: string } | void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const req = await prisma.serviceRequest.findUnique({
        where: { id: requestId },
        select: { studentId: true, status: true, serviceId: true },
    });
    if (!req || req.studentId !== user.id) return { error: "Not found." };
    if (req.status !== "PENDING_PAYMENT") {
        return { error: "This request can no longer be cancelled." };
    }

    await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
    });
    revalidatePath("/portal/services");
}

/**
 * Client-side coupon lookup used by the request form to show the preview
 * before submission. Never mutates.
 */
export async function previewServiceCouponAction(input: {
    serviceSlug: string;
    couponCode: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const current = await loadCurrentUser(user.id);
    if (!current?.dojoId) return { error: "No dojo assignment." };

    const service = await prisma.service.findUnique({
        where: { slug: input.serviceSlug },
        select: { id: true, feeBDT: true },
    });
    if (!service) return { error: "Service not found." };

    const check = await previewCoupon({
        code: input.couponCode,
        studentDojoId: current.dojoId,
        serviceId: service.id,
        fee: Number(service.feeBDT),
    });
    if ("error" in check) return { error: check.error };
    return { preview: check.preview };
}

