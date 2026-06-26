"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { generateCertificatePdf } from "@/lib/certificates/generate";

const settingsSchema = z.object({
    adminSignerName: z.string().trim().max(200).nullable().optional(),
    adminSignerTitle: z.string().trim().max(200).nullable().optional(),
    adminSignatureDataUrl: z.string().nullable().optional(),
    certificateLogoDataUrl: z.string().nullable().optional(),
    clearSignature: z.boolean().optional(),
    clearLogo: z.boolean().optional(),
});

export async function saveCertificateSettingsAction(
    input: z.infer<typeof settingsSchema>,
): Promise<{ success: true } | { error: string }> {
    await requireAdmin();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const patch: Record<string, unknown> = {
        adminSignerName: parsed.data.adminSignerName ?? null,
        adminSignerTitle: parsed.data.adminSignerTitle ?? null,
    };

    try {
        if (parsed.data.clearSignature) {
            patch.adminSignatureUrl = null;
        } else if (parsed.data.adminSignatureDataUrl) {
            const uploaded = await uploadToCloudinary(
                parsed.data.adminSignatureDataUrl,
                {
                    folder: `${CLOUDINARY_FOLDERS.certificates}/signatures`,
                    publicId: "admin-signature",
                    resourceType: "image",
                },
            );
            patch.adminSignatureUrl = uploaded.url;
        }

        if (parsed.data.clearLogo) {
            patch.certificateLogoUrl = null;
        } else if (parsed.data.certificateLogoDataUrl) {
            const uploaded = await uploadToCloudinary(
                parsed.data.certificateLogoDataUrl,
                {
                    folder: `${CLOUDINARY_FOLDERS.certificates}/logos`,
                    publicId: "certificate-logo",
                    resourceType: "image",
                },
            );
            patch.certificateLogoUrl = uploaded.url;
        }

        await prisma.systemSettings.upsert({
            where: { id: "default" },
            update: patch,
            create: { id: "default", ...patch },
        });
    } catch (e) {
        console.error("[saveCertificateSettings] failed", e);
        return { error: "Could not save settings. Try again." };
    }

    revalidatePath("/portal/admin/certificates");
    return { success: true };
}

const regenSchema = z.object({
    certificateRequestId: z.string().uuid(),
});

/**
 * Re-render an already-ISSUED certificate. Used after the template or
 * generator changes so old PDFs pick up the new design without needing a
 * brand-new request.
 */
export async function regenerateCertificateAction(
    input: z.infer<typeof regenSchema>,
): Promise<{ success: true; url: string } | { error: string }> {
    await requireAdmin();
    const parsed = regenSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const res = await generateCertificatePdf({
        certificateRequestId: parsed.data.certificateRequestId,
        force: true,
    });
    if (!res.ok) return { error: res.reason };

    revalidatePath(`/certificates/${parsed.data.certificateRequestId}`);
    revalidatePath("/portal/admin/certificates");
    return { success: true, url: res.url };
}

const priceSchema = z.object({
    rankId: z.string().uuid(),
    price: z.number().nonnegative().max(1_000_000).nullable(),
});

export async function saveRankCertificatePriceAction(
    input: z.infer<typeof priceSchema>,
): Promise<{ success: true } | { error: string }> {
    await requireAdmin();
    const parsed = priceSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
        await prisma.beltRank.update({
            where: { id: parsed.data.rankId },
            data: { certificatePrice: parsed.data.price },
        });
    } catch (e) {
        console.error("[saveRankCertificatePrice] failed", e);
        return { error: "Could not save price. Try again." };
    }

    revalidatePath("/portal/admin/certificates");
    return { success: true };
}
