"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/validation/phone";
import { isSyntheticEmail } from "@/lib/format/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateAccountAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const fullName  = (formData.get("fullName") as string)?.trim();
    const phone     = (formData.get("phone") as string)?.trim();
    const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || null;
    const bio       = (formData.get("bio") as string)?.trim() || null;
    const contactEmailRaw = (formData.get("contactEmail") as string) ?? "";
    const contactEmail = contactEmailRaw.trim().toLowerCase() || null;

    if (!fullName) return { error: "Full name is required." };
    const phoneError = validatePhone(phone);
    if (phoneError) return { error: phoneError };
    if (bio && bio.length > 280) return { error: "Bio must be 280 characters or less." };
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
        return { error: "Please enter a valid email address." };
    }

    // For accounts whose auth email is a real address (admins), keep Supabase
    // Auth in sync so password-reset and OTP mail still reach the user.
    const existing = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
    });
    const shouldUpdateAuthEmail =
        !!contactEmail &&
        !!existing &&
        !isSyntheticEmail(existing.email) &&
        existing.email.toLowerCase() !== contactEmail;

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { fullName, phone, avatarUrl, bio, contactEmail },
        });

        revalidatePath("/portal/account");
        revalidatePath("/portal");

        if (shouldUpdateAuthEmail) {
            const { error } = await supabase.auth.updateUser({ email: contactEmail! });
            if (error) {
                return {
                    success: true,
                    notice: `Contact email saved, but the sign-in email couldn't be updated: ${error.message}`,
                };
            }
            return {
                success: true,
                notice:
                    "Contact email saved. Confirm the change from the verification link we sent to your new address.",
            };
        }

        return { success: true };
    } catch (err: any) {
        if (err?.code === "P2002") {
            return { error: "That email is already in use on another account." };
        }
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
