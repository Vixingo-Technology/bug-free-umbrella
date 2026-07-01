"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT, MEMBERSHIP_DURATION_YEARS } from "@/lib/constants";

/**
 * Creates a renewal ShopOrder and redirects to checkout.
 * The order carries includesMembership: true so the webhook knows
 * to extend expiryDate on payment.
 */
export async function createRenewalOrderAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        // Delete any previous pending renewal orders to avoid duplicates
        await prisma.shopOrder.deleteMany({
            where: {
                userId: user.id,
                paymentStatus: "PENDING",
                includesMembership: true,
            },
        });

        const order = await prisma.shopOrder.create({
            data: {
                userId: user.id,
                total: MEMBERSHIP_FEE_BDT,
                membershipFee: MEMBERSHIP_FEE_BDT,
                includesMembership: true,
                paymentStatus: "PENDING",
                notes: `Renewal for ${MEMBERSHIP_DURATION_YEARS} year`,
            },
        });

        redirect(`/portal/checkout?orderId=${order.id}`);
    } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        return { error: err?.message ?? "Failed to create renewal order." };
    }
}
