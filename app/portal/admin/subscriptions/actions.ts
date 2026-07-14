"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

const feeInput = z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
        if (v === null || v === "") return null;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === null || (v >= 0 && v <= 1_000_000), {
        message: "Fee must be between 0 and 1,000,000 BDT.",
    });

const schema = z.object({
    dojoEnlistmentFeeBDT: feeInput,
    dojoRenewalFeeBDT: feeInput,
    membershipFeeBDT: feeInput,
    transferFeeBDT: feeInput,
});

export type UpdateFeesResult =
    | { ok: true }
    | { ok: false; error: string };

export async function updateSubscriptionFeesAction(
    formData: FormData
): Promise<UpdateFeesResult> {
    await requireAdmin();

    const parsed = schema.safeParse({
        dojoEnlistmentFeeBDT: formData.get("dojoEnlistmentFeeBDT"),
        dojoRenewalFeeBDT: formData.get("dojoRenewalFeeBDT"),
        membershipFeeBDT: formData.get("membershipFeeBDT"),
        transferFeeBDT: formData.get("transferFeeBDT"),
    });

    if (!parsed.success) {
        return {
            ok: false,
            error:
                parsed.error.issues[0]?.message ??
                "Please enter valid fee values.",
        };
    }

    await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: parsed.data,
        create: { id: "default", ...parsed.data },
    });

    revalidatePath("/portal/admin/subscriptions");
    revalidatePath("/enlist-dojo");
    revalidatePath("/enlist-dojo/payment");
    revalidatePath("/portal/renew");
    revalidatePath("/portal/dojo/renewals");
    revalidatePath("/portal/transfer");
    return { ok: true };
}
