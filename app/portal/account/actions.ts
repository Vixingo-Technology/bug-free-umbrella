"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/validation/phone";

export async function updateAccountAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const phone    = (formData.get("phone") as string)?.trim();
    const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || null;
    const bio      = (formData.get("bio") as string)?.trim() || null;

    if (!fullName) return { error: "Full name is required." };
    const phoneError = validatePhone(phone);
    if (phoneError) return { error: phoneError };
    if (bio && bio.length > 280) return { error: "Bio must be 280 characters or less." };

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { fullName, phone, avatarUrl, bio },
        });

        revalidatePath("/portal/account");
        revalidatePath("/portal");
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Update failed." };
    }
}

export async function changePasswordAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const newPassword     = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!newPassword || newPassword.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }
    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    return { success: true };
}
