"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";
import { resolvePostAuthLanding } from "@/lib/auth/post-auth-landing";
import { prisma } from "@/lib/prisma";
import { isRegNo, isDojoOwnerRegNo } from "@/lib/members/reg-no";

export async function loginAction(formData: FormData) {
    const supabase = await createClient();

    const memberId = ((formData.get("memberId") as string)
        ?? (formData.get("identifier") as string) // legacy field name
        ?? "").trim().toUpperCase();
    const password = formData.get("password") as string;

    if (!memberId || !password) {
        return { error: "Member ID and password are required." };
    }

    if (!isRegNo(memberId) && !isDojoOwnerRegNo(memberId)) {
        return {
            error: "That doesn't look like a Member ID. Use the format JKA-BD-123456 or JKA-BD-DHA-0001.",
        };
    }

    const user = await prisma.user.findUnique({
        where: { memberNumber: memberId },
        select: { email: true },
    });
    if (!user?.email) {
        return { error: "No account found for that Member ID." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/portal");
}

// Synthetic Supabase-auth email for non-admin users. Real contact email lives
// on `users.contact_email` (nullable, non-unique) so families can share one
// inbox across multiple accounts.
const SYNTHETIC_EMAIL_DOMAIN = "members.jkabangladesh.com";

function makeSyntheticEmail(): string {
    return `${crypto.randomUUID()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export async function signupAction(formData: FormData) {
    const supabase = await createClient();

    const firstName = ((formData.get("firstName") as string) ?? "").trim();
    const lastName = ((formData.get("lastName") as string) ?? "").trim();
    const password = formData.get("password") as string;
    const contactEmail = ((formData.get("contactEmail") as string) ?? "").trim().toLowerCase();
    const contactPhone = ((formData.get("contactPhone") as string) ?? "").trim();

    if (!firstName || !lastName || !password) {
        return { error: "Name and password are required." };
    }
    if (password.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }
    if (!contactEmail) {
        return { error: "Contact email is required." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return { error: "Please enter a valid contact email." };
    }
    if (!contactPhone) {
        return { error: "Contact phone is required." };
    }

    // Auth email is synthetic — the user never sees or types it. Member ID is
    // the login credential.
    const syntheticEmail = makeSyntheticEmail();

    const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                role: "STUDENT",
                contact_email: contactEmail,
                contact_phone: contactPhone,
            },
        },
    });

    if (error) {
        return { error: error.message };
    }
    if (!data.user) {
        return { error: "Could not create your account. Please try again." };
    }

    await provisionMemberFromSupabaseUser(data.user);

    // If Supabase returned a session (email confirmation disabled), we're
    // already signed in. Otherwise sign in with the synthetic email + password.
    if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password,
        });
        if (signInError) {
            // Signup succeeded but sign-in failed — surface a helpful message
            // pointing to the Member ID that was just generated.
            return {
                error:
                    "Account created, but sign-in failed. Please look up your Member ID from your dojo and try logging in.",
            };
        }
    }

    // Skip the /portal → /portal/onboarding double-hop — that leaves the
    // client router on a stale RSC tree and shows a blank screen with a
    // retry loop until the user reloads.
    redirect(await resolvePostAuthLanding(data.user.id));
}

export async function signoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

export async function forgotPasswordAction(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) return { error: "Email is required." };

    // Only admins can self-reset via email — everyone else has a synthetic
    // auth email and must go through their Dojo Head or a JKA admin. We
    // still return `ok` in every non-admin branch so the response shape
    // doesn't leak whether the address is registered.
    const target = await prisma.user.findUnique({
        where: { email },
        select: { roleId: true },
    });
    if (!target || target.roleId !== "ADMIN") {
        return { ok: true };
    }

    const supabase = await createClient();
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/set-password?mode=reset")}`,
    });

    if (error) console.error("[forgotPasswordAction]", error.message);
    return { ok: true };
}
