"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { assignRole } from "@/lib/auth/assign-role";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type DojoEnlistmentInput = {
    dojoName: string;
    /** Cloudinary URL — upload via `uploadDojoAssetFromDataUrl` before calling commit. */
    logoUrl?: string | null;
    email: string;
    phone: string;
    contactName: string;
    contactRank: string;
    address: string;
    latitude: string;
    longitude: string;
    /** Cloudinary URLs — upload via `uploadDojoAssetFromDataUrl` before calling commit. */
    interiorUrls?: string[];
};

/**
 * Upload a single dojo asset (logo or interior photo) from a base64 data URL
 * to Cloudinary and return the public URL. Called from the client one asset
 * at a time so we never push megabytes of base64 through a single server
 * action call (which trips the RSC "Maximum array nesting exceeded" limit).
 */
export async function uploadDojoAssetFromDataUrl(
    dataUrl: string,
    kind: "logo" | "interior"
): Promise<{ error?: string; url?: string }> {
    if (!dataUrl?.startsWith("data:")) {
        return { error: "Invalid image payload." };
    }
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Your session has expired. Please restart the enlistment." };
    }
    try {
        const { url } = await uploadToCloudinary(dataUrl, {
            folder: kind === "logo" ? "jka/dojo-logos" : "jka/dojo-interiors",
            publicId:
                kind === "logo"
                    ? `${user.id}-logo`
                    : `${user.id}-interior-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 8)}`,
            resourceType: "image",
        });
        return { url };
    } catch (e) {
        console.error("[enlist-dojo] asset upload failed", e);
        return {
            error:
                e instanceof Error
                    ? e.message
                    : "Could not upload image. Please try again.",
        };
    }
}

/**
 * Step 1 — kick off enlistment.
 * Sends a Supabase email OTP. We do NOT touch the database yet;
 * the form payload lives in client sessionStorage until commit.
 */
export async function submitDojoEnlistment(
    input: Pick<DojoEnlistmentInput, "dojoName" | "email">
): Promise<{ error?: string }> {
    if (!input.email?.trim() || !input.email.includes("@")) {
        return { error: "Please enter a valid email address." };
    }
    if (!input.dojoName?.trim()) {
        return { error: "Dojo name is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
        options: {
            shouldCreateUser: true,
            data: {
                pending_dojo_name: input.dojoName,
                role: "DOJO_OWNER",
            },
        },
    });

    if (error) {
        return { error: error.message };
    }
    return {};
}

/**
 * Step 2 — verify the 6-digit OTP. Establishes a Supabase session
 * so subsequent calls (setPassword, commit) run as the dojo owner.
 */
export async function verifyDojoOtp(
    email: string,
    code: string
): Promise<{ error?: string }> {
    if (!code || code.length < 6) {
        return { error: "Please enter the 6-digit code from your email." };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
    });
    if (error) {
        return { error: error.message };
    }
    return {};
}

/**
 * Step 3 — set the dojo owner's account password.
 */
export async function setDojoOwnerPassword(
    password: string,
    confirm: string
): Promise<{ error?: string }> {
    if (!password || password.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }
    if (password !== confirm) {
        return { error: "Passwords do not match." };
    }
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Your verification has expired. Please restart the enlistment.",
        };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return {};
}

/**
 * Resend the OTP email for the current enlistment.
 */
export async function resendDojoOtp(
    email: string
): Promise<{ error?: string }> {
    if (!email?.trim() || !email.includes("@")) {
        return { error: "Missing email address." };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return {};
}

/**
 * Step 4 — initiate payment (stub gateway).
 * Real implementation will create an SSLCommerz session.
 */
export async function initiateDojoEnlistmentPayment(
    _email: string
): Promise<{ error?: string; redirectUrl?: string }> {
    return {};
}

/**
 * Commit the enlistment. Creates:
 *   - Dojo (isActive = paidNow) with the uploaded logo URL.
 *   - DojoOwner linking the current user to the Dojo.
 *   - Application row with the Cloudinary URLs.
 *
 * paidNow = false → application stays PENDING_PAYMENT and the dashboard
 * shows the "Activate your Dojo" banner. Once payment lands the dojo is
 * flipped to isActive=true via markDojoEnlistmentPaid.
 *
 * Trainer / instructor / student invites are handled from the dashboard
 * after activation — no invites are sent from this action.
 */
export async function commitDojoEnlistment(
    input: DojoEnlistmentInput,
    options: { paidNow: boolean } = { paidNow: false }
): Promise<{ error?: string; applicationId?: string; dojoId?: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Your session has expired. Please restart the enlistment.",
        };
    }

    if (
        !input.dojoName?.trim() ||
        !input.email?.trim() ||
        !input.phone?.trim() ||
        !input.contactName?.trim() ||
        !input.address?.trim()
    ) {
        return { error: "Some required fields are missing." };
    }

    const lat = input.latitude ? parseFloat(input.latitude) : null;
    const lng = input.longitude ? parseFloat(input.longitude) : null;
    const contactRank = input.contactRank?.trim() || "";

    // Images have already been uploaded via uploadDojoAssetFromDataUrl —
    // we only receive URLs here.
    const logoUrl: string | null = input.logoUrl ?? null;
    const interiorUrls: string[] = input.interiorUrls ?? [];

    const existing = await prisma.dojoApplication.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, dojoId: true, status: true, interiorUrls: true, logoUrl: true },
    });

    let applicationId: string;
    let dojoId: string | null = existing?.dojoId ?? null;

    // Merge with existing images so re-committing doesn't drop earlier uploads.
    const finalLogoUrl = logoUrl ?? existing?.logoUrl ?? null;
    const finalInteriorUrls =
        interiorUrls.length > 0
            ? interiorUrls
            : existing?.interiorUrls ?? [];

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.upsert({
                where: { id: user.id },
                create: {
                    id: user.id,
                    email: input.email.trim(),
                    fullName: input.contactName.trim(),
                    phone: input.phone.trim(),
                    roleId: "DOJO_OWNER",
                },
                update: {
                    fullName: input.contactName.trim(),
                    phone: input.phone.trim(),
                    roleId: "DOJO_OWNER",
                },
            });

            if (!dojoId) {
                const dojo = await tx.dojo.create({
                    data: {
                        name: input.dojoName.trim(),
                        address: input.address.trim(),
                        phone: input.phone.trim(),
                        email: input.email.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
                        logoUrl: finalLogoUrl,
                        isActive: options.paidNow,
                    },
                    select: { id: true },
                });
                dojoId = dojo.id;
            } else {
                await tx.dojo.update({
                    where: { id: dojoId },
                    data: {
                        name: input.dojoName.trim(),
                        address: input.address.trim(),
                        phone: input.phone.trim(),
                        email: input.email.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
                        logoUrl: finalLogoUrl,
                        isActive: options.paidNow ? true : undefined,
                    },
                });
            }

            await tx.student.deleteMany({ where: { id: user.id } });
            await tx.instructor.deleteMany({ where: { id: user.id } });
            await tx.dojoManager.deleteMany({ where: { id: user.id } });
            await tx.dojoOwner.upsert({
                where: { id: user.id },
                create: { id: user.id, dojoId },
                update: { dojoId },
            });

            if (existing) {
                await tx.dojoApplication.update({
                    where: { id: existing.id },
                    data: {
                        dojoName: input.dojoName.trim(),
                        logoUrl: finalLogoUrl,
                        email: input.email.trim(),
                        phone: input.phone.trim(),
                        contactName: input.contactName.trim(),
                        contactRole: "Head Instructor",
                        contactRank,
                        address: input.address.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
                        interiorUrls: finalInteriorUrls,
                        trainers: [],
                        status: options.paidNow ? "PAID" : "PENDING_PAYMENT",
                        dojoId,
                    },
                });
                applicationId = existing.id;
            } else {
                const created = await tx.dojoApplication.create({
                    data: {
                        userId: user.id,
                        dojoName: input.dojoName.trim(),
                        logoUrl: finalLogoUrl,
                        email: input.email.trim(),
                        phone: input.phone.trim(),
                        contactName: input.contactName.trim(),
                        contactRole: "Head Instructor",
                        contactRank,
                        address: input.address.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
                        interiorUrls: finalInteriorUrls,
                        trainers: [],
                        status: options.paidNow ? "PAID" : "PENDING_PAYMENT",
                        dojoId,
                    },
                    select: { id: true },
                });
                applicationId = created.id;
            }
        });
    } catch (e) {
        const message =
            e instanceof Error ? e.message : "Could not save your enlistment.";
        return { error: message };
    }

    await assignRole(user.id, "DOJO_OWNER", { dojoId });

    await notifyAdmins({
        title: "New dojo enlistment",
        message: `${input.dojoName.trim()} — submitted by ${input.contactName.trim()}. Review and approve.`,
        type: "INFO",
        link: "/portal/admin/dojos/applications",
    });

    return { applicationId: applicationId!, dojoId: dojoId! };
}

/**
 * Flip the dojo to active + application to PAID once payment is received.
 */
export async function markDojoEnlistmentPaid(
    applicationId: string,
    paymentId?: string
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Session expired." };

    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, userId: true, dojoId: true, status: true },
    });
    if (!application || application.userId !== user.id) {
        return { error: "Application not found." };
    }
    if (application.status === "PAID" || application.status === "APPROVED") {
        return {};
    }

    try {
        await prisma.$transaction(async (tx) => {
            if (application.dojoId) {
                await tx.dojo.update({
                    where: { id: application.dojoId },
                    data: { isActive: true },
                });
            }
            await tx.dojoApplication.update({
                where: { id: application.id },
                data: {
                    status: "PAID",
                    paymentId: paymentId ?? `paid:${Date.now()}`,
                },
            });
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Activation failed.";
        return { error: message };
    }
    return {};
}

/**
 * Sign out and clear the draft cookie — used if the user abandons.
 */
export async function abandonDojoEnlistment() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/enlist-dojo");
}
