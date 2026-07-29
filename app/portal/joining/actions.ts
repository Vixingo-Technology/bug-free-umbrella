"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFees } from "@/lib/settings/fees";

/**
 * Create (or reuse) the pending JKA membership order for a student who
 * still owes the first fee, then redirect them to checkout. The student
 * may reach the joining page before ever seeing the wizard — this is the
 * on-demand path back into checkout.
 */
export async function startMembershipPaymentAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const existing = await prisma.shopOrder.findFirst({
        where: {
            userId: user.id,
            paymentStatus: "PENDING",
            includesMembership: true,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
    });

    let orderId = existing?.id;
    if (!orderId) {
        const { membershipFeeBDT } = await getFees();
        const order = await prisma.shopOrder.create({
            data: {
                userId: user.id,
                total: membershipFeeBDT,
                membershipFee: membershipFeeBDT,
                includesMembership: true,
                paymentStatus: "PENDING",
            },
            select: { id: true },
        });
        orderId = order.id;
    }

    redirect(`/portal/checkout?orderId=${orderId}`);
}

/**
 * Create (or reuse) a pending past-belt fee order and redirect to checkout.
 * Only allowed when the student is in PAST_BELT_UNPAID with a positive fee.
 */
export async function startPastBeltPaymentAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const student = await prisma.student.findUnique({
        where: { id: user.id },
        select: { joinStage: true, pastBeltFeeBDT: true },
    });
    if (student?.joinStage !== "PAST_BELT_UNPAID") {
        return { error: "Not eligible for past-belt payment." };
    }
    const fee = Number(student.pastBeltFeeBDT ?? 0);
    if (fee <= 0) return { error: "No past-belt fee is due." };

    const existing = await prisma.shopOrder.findFirst({
        where: {
            userId: user.id,
            paymentStatus: "PENDING",
            includesPastBeltFee: true,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, total: true },
    });

    let orderId = existing?.id;
    if (!orderId || Number(existing?.total ?? 0) !== fee) {
        // Purge any stale past-belt order and create a fresh one so the
        // amount always reflects the current pastBeltFeeBDT.
        await prisma.shopOrder.deleteMany({
            where: {
                userId: user.id,
                paymentStatus: "PENDING",
                includesPastBeltFee: true,
            },
        });
        const order = await prisma.shopOrder.create({
            data: {
                userId: user.id,
                total: fee,
                includesPastBeltFee: true,
                paymentStatus: "PENDING",
            },
            select: { id: true },
        });
        orderId = order.id;
    }

    redirect(`/portal/checkout?orderId=${orderId}`);
}
