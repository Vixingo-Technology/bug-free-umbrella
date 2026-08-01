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
