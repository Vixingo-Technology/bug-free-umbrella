"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Supabase will redirect to /auth/callback after email confirmation
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? ""}/auth/callback`,
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

    // If Supabase returned a session immediately (email confirmation disabled),
    // go straight to the portal. Otherwise show the "check your email" screen.
    if (data.session) {
        redirect("/portal");
    }

    redirect("/auth/verify");
}

export async function signoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}
