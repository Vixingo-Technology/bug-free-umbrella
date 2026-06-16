"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPasswordAction(formData: FormData) {
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (!password || password.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }
    if (password !== confirm) {
        return { error: "Passwords do not match." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Your invite link has expired. Ask an admin to resend it." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };

    redirect("/portal");
}
