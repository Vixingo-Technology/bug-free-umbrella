"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { provisionMemberFromSupabaseUser } from "@/lib/auth/provision-member";

export async function loginAction(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/portal");
}

export async function signupAction(formData: FormData) {
    const supabase = await createClient();

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const currentRank = formData.get("currentRank") as string;

    if (!firstName || !lastName || !email || !password) {
        return { error: "All required fields must be filled." };
    }

    // No emailRedirectTo — Supabase's "Confirm signup" template should render
    // {{ .Token }} (a 6-digit OTP). The user enters that code on /auth/verify.
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                current_rank: currentRank || "White Belt",
                role: "STUDENT",
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    // Supabase does not throw on duplicate email — instead it returns a
    // shadow user with an empty `identities` array (an anti-enumeration
    // measure). Detect that shape and tell the user plainly.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return { error: "This email is already registered. Please log in instead." };
    }

    // If Supabase returned a session immediately (email confirmation disabled),
    // provision the member row and skip the OTP step.
    if (data.session && data.user) {
        await provisionMemberFromSupabaseUser(data.user);
        redirect("/portal");
    }

    redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
}

export async function verifySignupOtp(email: string, code: string) {
    if (!email) return { error: "Missing email." };
    if (!code || code.length < 6) {
        return { error: "Please enter the 6-digit code from your email." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
    });

    if (error) return { error: error.message };
    if (!data.user) return { error: "Verification failed. Please try again." };

    await provisionMemberFromSupabaseUser(data.user);
    redirect("/portal/onboarding");
}

export async function resendSignupOtp(email: string) {
    if (!email?.trim() || !email.includes("@")) {
        return { error: "Missing email address." };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return { error: error.message };
    return { ok: true };
}

export async function signoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

export async function forgotPasswordAction(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) return { error: "Email is required." };

    const supabase = await createClient();
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/set-password?mode=reset")}`,
    });

    // Always return ok so the form doesn't leak whether the email exists.
    if (error) console.error("[forgotPasswordAction]", error.message);
    return { ok: true };
}
