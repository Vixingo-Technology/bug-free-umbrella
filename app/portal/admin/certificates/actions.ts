"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { generateCertificatePdf } from "@/lib/certificates/generate";
import { notifyMembers } from "@/lib/notify";
import { findUserIdsByRoles } from "@/lib/notify/recipients";

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
    revalidatePath("/portal/admin/certificates/settings");
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
    revalidatePath("/portal/admin/certificates/settings");
    return { success: true };
}

const approveSchema = z.object({
    certificateRequestId: z.string().uuid(),
});

/**
 * JKA admin approval for a certificate request submitted by a dojo. Only
 * requests that are PAID (i.e. the dojo has paid but no PDF has been rendered
 * yet) can be approved. Generates the PDF, marks the request ISSUED, and
 * notifies the dojo owner that the certificate is ready to download.
 */
export async function approveCertificateRequestAction(
    input: z.infer<typeof approveSchema>,
): Promise<{ success: true; url: string } | { error: string }> {
    await requireAdmin();
    const parsed = approveSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const req = await prisma.certificateRequest.findUnique({
        where: { id: parsed.data.certificateRequestId },
        select: { id: true, status: true, dojoId: true, memberName: true, rankName: true, dojo: { select: { name: true } } },
    });
    if (!req) return { error: "Certificate request not found." };
    if (req.status !== "PAID") {
        return {
            error:
                req.status === "ISSUED"
                    ? "This certificate is already issued."
                    : `Cannot approve a request in state ${req.status}.`,
        };
    }

    const res = await generateCertificatePdf({
        certificateRequestId: parsed.data.certificateRequestId,
    });
    if (!res.ok) return { error: res.reason };

    // Ping the dojo owner(s) so they know the certificate is ready.
    const ownerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: req.dojoId });
    await notifyMembers(ownerIds, {
        title: "Certificate approved by JKA HQ",
        message: `${req.memberName}'s ${req.rankName ?? "certificate"} has been approved. The online copy is ready to download.`,
        type: "GRADING",
        link: "/portal/dojo/gradings",
    });

    revalidatePath("/portal/admin/certificates");
    revalidatePath("/portal/dojo/certificates");
    revalidatePath("/portal/dojo/gradings");
    return { success: true, url: res.url };
}
