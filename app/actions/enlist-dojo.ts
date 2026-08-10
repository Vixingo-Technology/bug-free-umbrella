"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { assignRole } from "@/lib/auth/assign-role";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getFees } from "@/lib/settings/fees";
import { ensureDojoOwnerRegNo, divisionCode } from "@/lib/members/reg-no";

export type DojoEnlistmentInput = {
    dojoName: string;
    /** Concise label displayed above "Dojo Console" in the portal sidebar. */
    shortName?: string;
    email: string;
    phone: string;
    contactName: string;
    contactRank: string;
    /** ISO yyyy-mm-dd — Dojo Head's date of birth; must be 18+ at submission. */
    contactDob: string;
    address: string;
    latitude: string;
    longitude: string;
    /** One of the 8 Bangladesh divisions — stored on `Dojo.city` and drives the landing-page filter. */
    division?: string;
    /** Cloudinary URLs — upload via `uploadDojoAssetFromDataUrl` before calling commit. */
    interiorUrls?: string[];
};

const DOJO_OWNER_MIN_AGE = 18;

function ageInYears(dob: Date, now: Date): number {
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

/**
 * Upload a single dojo interior photo from a base64 data URL to Cloudinary
 * and return the public URL. Called from the client one asset at a time so
 * we never push megabytes of base64 through a single server action call
 * (which trips the RSC "Maximum array nesting exceeded" limit).
 */
export async function uploadDojoAssetFromDataUrl(
    dataUrl: string,
    _kind: "interior"
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
            folder: "jka/dojo-interiors",
            publicId: `${user.id}-interior-${Date.now()}-${Math.random()
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
 * Step 4 — initiate payment. Starts an SSLCommerz sandbox session for the
 * given dojo application. The application must already be committed (as
 * PENDING_PAYMENT); the returned gateway URL should be opened via
 * `window.location`. If SSLCommerz isn't configured, we mark the application
 * paid directly (dev bypass) and return no redirect URL.
 */
export async function initiateDojoEnlistmentPayment(
    applicationId: string
): Promise<{ error?: string; redirectUrl?: string; devPaid?: boolean }> {
    if (!applicationId?.trim()) {
        return { error: "Missing application reference." };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Your session has expired. Please restart the enlistment.",
        };
    }

    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
        select: {
            id: true,
            userId: true,
            dojoName: true,
            email: true,
            phone: true,
            contactName: true,
            address: true,
            status: true,
        },
    });
    if (!application || application.userId !== user.id) {
        return { error: "Application not found." };
    }
    if (application.status === "PAID" || application.status === "APPROVED") {
        return { error: "This application is already paid." };
    }

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    // Dev bypass — no credentials configured. Mark paid straight away.
    if (
        !storeId ||
        storeId === "your-sslcommerz-store-id" ||
        !storePassword
    ) {
        await markDojoEnlistmentPaidInternal(
            application.id,
            `DEV-${Date.now()}`
        );
        return { devPaid: true };
    }

    const gatewayUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const { dojoEnlistmentFeeBDT } = await getFees();

    const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: dojoEnlistmentFeeBDT.toFixed(2),
        currency: "BDT",
        tran_id: application.id,
        success_url: `${appUrl}/api/webhooks/sslcommerz/dojo-success?applicationId=${application.id}`,
        fail_url: `${appUrl}/enlist-dojo/failed?applicationId=${application.id}`,
        cancel_url: `${appUrl}/enlist-dojo/failed?applicationId=${application.id}&cancelled=1`,
        ipn_url: `${appUrl}/api/webhooks/sslcommerz`,
        cus_name: application.contactName,
        cus_email: application.email,
        cus_phone: application.phone,
        cus_add1: application.address,
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        ship_name: application.contactName,
        ship_add1: application.address,
        ship_city: "Dhaka",
        ship_postcode: "1000",
        ship_country: "Bangladesh",
        product_name: `Dojo enlistment — ${application.dojoName}`.slice(0, 100),
        product_category: "Membership",
        product_profile: "non-physical-goods",
        num_of_item: "1",
    });

    try {
        const res = await fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const json = await res.json();
        if (json.status === "SUCCESS" && json.GatewayPageURL) {
            return { redirectUrl: json.GatewayPageURL as string };
        }
        return {
            error:
                json.failedreason ??
                "Payment gateway error. Please try again.",
        };
    } catch {
        return {
            error:
                "Could not reach the payment gateway. Please check your connection and try again.",
        };
    }
}

/**
 * Service-level (no auth check) helper used by the SSLCommerz webhook after
 * IPN validation succeeds. Flips the dojo → active and the application →
 * PAID in a single transaction. Idempotent.
 */
export async function markDojoEnlistmentPaidInternal(
    applicationId: string,
    paymentId: string
): Promise<{ ok: boolean }> {
    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, dojoId: true, status: true },
    });
    if (!application) return { ok: false };
    if (application.status === "PAID" || application.status === "APPROVED") {
        return { ok: true };
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
                    paymentId,
                },
            });
        });
        return { ok: true };
    } catch (e) {
        console.error("[enlist-dojo] markDojoEnlistmentPaidInternal failed", e);
        return { ok: false };
    }
}

/**
 * Commit the enlistment. Creates:
 *   - Dojo (isActive = paidNow).
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
        !input.contactDob?.trim() ||
        !input.address?.trim()
    ) {
        return { error: "Some required fields are missing." };
    }

    const contactDob = new Date(input.contactDob);
    if (isNaN(contactDob.getTime())) {
        return { error: "Please enter a valid date of birth." };
    }
    if (ageInYears(contactDob, new Date()) < DOJO_OWNER_MIN_AGE) {
        return { error: `Dojo Head must be at least ${DOJO_OWNER_MIN_AGE} years old.` };
    }

    const lat = input.latitude ? parseFloat(input.latitude) : null;
    const lng = input.longitude ? parseFloat(input.longitude) : null;
    const contactRank = input.contactRank?.trim() || "";
    const division = input.division?.trim() || null;
    const shortName = input.shortName?.trim() || null;

    // Images have already been uploaded via uploadDojoAssetFromDataUrl —
    // we only receive URLs here.
    const interiorUrls: string[] = input.interiorUrls ?? [];

    const existing = await prisma.dojoApplication.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, dojoId: true, status: true, interiorUrls: true },
    });

    let applicationId: string;
    let dojoId: string | null = existing?.dojoId ?? null;

    // Merge with existing images so re-committing doesn't drop earlier uploads.
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
                        shortName,
                        address: input.address.trim(),
                        city: division,
                        phone: input.phone.trim(),
                        email: input.email.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
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
                        shortName,
                        address: input.address.trim(),
                        city: division ?? undefined,
                        phone: input.phone.trim(),
                        email: input.email.trim(),
                        latitude: Number.isFinite(lat) ? lat : null,
                        longitude: Number.isFinite(lng) ? lng : null,
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
                        email: input.email.trim(),
                        phone: input.phone.trim(),
                        contactName: input.contactName.trim(),
                        contactRole: "Head Instructor",
                        contactRank,
                        contactDob,
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
                        email: input.email.trim(),
                        phone: input.phone.trim(),
                        contactName: input.contactName.trim(),
                        contactRole: "Head Instructor",
                        contactRank,
                        contactDob,
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

    // Dojo-owner Reg No format: JKA-BD-{DIV3}-{NNNN}, e.g. JKA-BD-DHA-0001.
    // Only assigned once the division is known — the enlistment form requires
    // it, so this normally fires on first commit. Silently no-ops on an
    // unknown division so the enlistment doesn't fail on a typo.
    if (division && divisionCode(division)) {
        await ensureDojoOwnerRegNo(user.id, division);
    }

    // If this owner arrived via an admin-issued invite, stamp acceptedAt so
    // the admin dojos page can tell "invited" apart from "pending".
    await prisma.dojoOwnerInvite.updateMany({
        where: { email: input.email.trim().toLowerCase(), acceptedAt: null },
        data: { acceptedAt: new Date() },
    });

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
