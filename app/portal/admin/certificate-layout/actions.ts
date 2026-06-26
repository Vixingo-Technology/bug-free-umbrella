"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import type { CertificateLayout } from "@/lib/certificates/layout";
import { saveCertificateLayout } from "@/lib/certificates/layout-server";

const textSpec = z.object({
    kind: z.literal("text"),
    cx: z.number(),
    y: z.number(),
    size: z.number().positive(),
    maxWidth: z.number().positive().optional(),
});

const imageSpec = z.object({
    kind: z.literal("image"),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    centered: z.boolean().optional(),
});

const layoutSchema = z.object({
    kyuDigit: textSpec,
    jpYear: textSpec,
    jpMonth: textSpec,
    jpDay: textSpec,
    memberName: textSpec,
    certificateNumber: textSpec,
    branch: textSpec,
    dateOfAward: textSpec,
    kyuNo: textSpec,
    ownerSignature: imageSpec,
    dojoLogo: imageSpec,
    qrCode: imageSpec,
});

/**
 * Persist the certificate layout to `lib/certificates/layout.json`.
 *
 * This writes to the project directory, so it only works in dev / local
 * runs. Vercel / production filesystems are read-only and will reject the
 * write — that's intentional, the layout is meant to live in source.
 */
export async function saveCertificateLayoutAction(
    input: CertificateLayout,
): Promise<{ success: true } | { error: string }> {
    await requireAdmin();
    const parsed = layoutSchema.safeParse(input);
    if (!parsed.success) {
        return {
            error:
                parsed.error.issues[0]?.message ?? "Invalid layout payload.",
        };
    }
    try {
        await saveCertificateLayout(parsed.data as CertificateLayout);
    } catch (e) {
        return {
            error:
                e instanceof Error
                    ? `Could not write layout.json: ${e.message}`
                    : "Could not write layout.json.",
        };
    }
    revalidatePath("/portal/admin/certificate-layout");
    return { success: true };
}
