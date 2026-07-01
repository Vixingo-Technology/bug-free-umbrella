"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { assignRole } from "@/lib/auth/assign-role";

export type DojoTrainerInput = {
    name: string;
    rank: string;
    contact: string;
};

export type DojoEnlistmentInput = {
    dojoName: string;
    logoUrl?: string;
    email: string;
    phone: string;
    contactName: string;
    contactRole: string;
    address: string;
    latitude: string;
    longitude: string;
    interiorUrls?: string[];
    trainers: DojoTrainerInput[];
};

/**
 * Step 1 — kick off enlistment.
 * Sends a Supabase email OTP. We do NOT touch the database yet;
 * the form payload lives in client sessionStorage until payment success.
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
 * Must be called while the OTP-verified session is active.
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
 * Step 4 — initiate payment.
 * Stub: returns success and lets the client redirect into the commit step.
 * Real implementation will create an SSLCommerz session and return the
 * gateway redirect URL; the success webhook will call commitDojoEnlistment.
 */
export async function initiateDojoEnlistmentPayment(
    _email: string
): Promise<{ error?: string; redirectUrl?: string }> {
    return {};
}

/**
 * Final step — commit the enlistment record to Postgres.
 * Called after the user "pays" (currently a stub redirect).
 * Requires an active Supabase session for the dojo owner.
 */
export async function commitDojoEnlistment(
    input: DojoEnlistmentInput
): Promise<{ error?: string; applicationId?: string }> {
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

    try {
        // Ensure a User row exists for the dojo owner with the right role.
        // Without this the /portal layout's safety-net creates one with the
        // STUDENT default and bounces the user into the student onboarding flow.
        await prisma.user.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: input.email.trim(),
                fullName: input.contactName.trim(),
                phone: input.phone.trim(),
                roleId: "DOJO_OWNER",
            },
            update: {
                roleId: "DOJO_OWNER",
            },
        });
        await assignRole(user.id, "DOJO_OWNER");

        const application = await prisma.dojoApplication.create({
            data: {
                userId: user.id,
                dojoName: input.dojoName.trim(),
                logoUrl: input.logoUrl ?? null,
                email: input.email.trim(),
                phone: input.phone.trim(),
                contactName: input.contactName.trim(),
                contactRole: input.contactRole.trim(),
                address: input.address.trim(),
                latitude: Number.isFinite(lat) ? lat : null,
                longitude: Number.isFinite(lng) ? lng : null,
                interiorUrls: input.interiorUrls ?? [],
                trainers: input.trainers ?? [],
                status: "PAID",
            },
            select: { id: true },
        });

        await notifyAdmins({
            title: "New dojo enlistment",
            message: `${input.dojoName.trim()} — submitted by ${input.contactName.trim()}. Review and approve.`,
            type: "INFO",
            link: "/portal/admin/dojos/applications",
        });

        return { applicationId: application.id };
    } catch (e) {
        const message =
            e instanceof Error ? e.message : "Could not save your enlistment.";
        return { error: message };
    }
}

/**
 * Sign out and clear the draft cookie — used if the user abandons.
 */
export async function abandonDojoEnlistment() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/enlist-dojo");
}
