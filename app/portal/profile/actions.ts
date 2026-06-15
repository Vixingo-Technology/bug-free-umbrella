"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function updateProfileAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const fullName              = (formData.get("fullName") as string)?.trim();
    const phone                 = (formData.get("phone") as string)?.trim() || null;
    const dojoId                = (formData.get("dojoId") as string) || null;
    const bloodGroup            = (formData.get("bloodGroup") as string) || null;
    const address               = (formData.get("address") as string)?.trim() || null;
    const nationalId            = (formData.get("nationalId") as string)?.trim() || null;
    const emergencyContactName  = (formData.get("emergencyContactName") as string)?.trim() || null;
    const emergencyContactPhone = (formData.get("emergencyContactPhone") as string)?.trim() || null;

    // dateOfBirth — convert "yyyy-mm-dd" string to Date or null
    const dobRaw = (formData.get("dateOfBirth") as string)?.trim();
    const dateOfBirth = dobRaw ? new Date(dobRaw) : null;

    if (!fullName) return { error: "Full name is required." };

    try {
        await prisma.member.update({
            where: { id: user.id },
            data: {
                fullName,
                phone,
                dojoId: dojoId || null,
                bloodGroup,
                address,
                nationalId,
                emergencyContactName,
                emergencyContactPhone,
                dateOfBirth,
            },
        });

        revalidatePath("/portal/profile");
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
