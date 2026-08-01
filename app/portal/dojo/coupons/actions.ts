"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/auth/load-current-user";

function generateCode() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
}

async function requireDojoActor() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." as const };

    const current = await loadCurrentUser(user.id);
    if (
        !current ||
        (current.role !== "DOJO_OWNER" && current.role !== "DOJO_MANAGER") ||
        !current.dojoId
    ) {
        return { error: "Only dojo staff can manage coupons." as const };
    }
    return { user, current };
}

export async function createServiceCouponAction(input: {
    discountPercent: number;
    serviceId?: string | null; // null = any service (including transfer)
    usageLimit?: number;
    expiresAt?: string | null;
    notes?: string;
}): Promise<{ error?: string } | void> {
    const guard = await requireDojoActor();
    if ("error" in guard) return guard;

    const discount = Math.floor(input.discountPercent);
    if (!(discount >= 1 && discount <= 100)) {
        return { error: "Discount must be between 1 and 100%." };
    }
    const usageLimit = Math.max(1, Math.floor(input.usageLimit ?? 1));

    let expiresAt: Date | null = null;
    if (input.expiresAt) {
        const d = new Date(input.expiresAt);
        if (Number.isNaN(d.getTime())) return { error: "Invalid expiry date." };
        expiresAt = d;
    }

    // Generate a unique code (retry a few times on collision).
    for (let attempt = 0; attempt < 6; attempt++) {
        const code = generateCode();
        try {
            await prisma.serviceCoupon.create({
                data: {
                    code,
                    dojoId: guard.current.dojoId!,
                    createdById: guard.user.id,
                    discountPercent: discount,
                    serviceId: input.serviceId ?? null,
                    usageLimit,
                    expiresAt,
                    notes: input.notes?.trim() || null,
                },
            });
            revalidatePath("/portal/dojo/coupons");
            return;
        } catch (err: any) {
            // Unique code collision — try another.
            if (err?.code === "P2002") continue;
            return { error: err?.message ?? "Failed to create coupon." };
        }
    }
    return { error: "Could not generate a unique code. Please try again." };
}

export async function deactivateCouponAction(id: string): Promise<{ error?: string } | void> {
    const guard = await requireDojoActor();
    if ("error" in guard) return guard;

    const coupon = await prisma.serviceCoupon.findUnique({
        where: { id },
        select: { dojoId: true, isActive: true },
    });
    if (!coupon || coupon.dojoId !== guard.current.dojoId) return { error: "Not found." };

    await prisma.serviceCoupon.update({
        where: { id },
        data: { isActive: !coupon.isActive },
    });
    revalidatePath("/portal/dojo/coupons");
}
