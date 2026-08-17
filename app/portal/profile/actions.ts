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
    const contactEmail          = (formData.get("contactEmail") as string)?.trim().toLowerCase() || null;
    const genderRaw             = (formData.get("gender") as string)?.trim() || null;
    const gender: "MALE" | "FEMALE" | null =
        genderRaw === "MALE" || genderRaw === "FEMALE" ? genderRaw : null;
    const bloodGroup            = (formData.get("bloodGroup") as string) || null;
    const address               = (formData.get("address") as string)?.trim() || null;
    const nationalId            = (formData.get("nationalId") as string)?.trim() || null;
    const fatherName            = (formData.get("fatherName") as string)?.trim() || null;
    const motherName            = (formData.get("motherName") as string)?.trim() || null;
    const emergencyContactName  = (formData.get("emergencyContactName") as string)?.trim() || null;
    const emergencyContactPhone = (formData.get("emergencyContactPhone") as string)?.trim() || null;

    // dateOfBirth — convert "yyyy-mm-dd" string to Date or null
    const dobRaw = (formData.get("dateOfBirth") as string)?.trim();
    const dateOfBirth = dobRaw ? new Date(dobRaw) : null;

    if (!fullName) return { error: "Full name is required." };
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return { error: "Enter a valid contact email address." };
    }

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { fullName, phone, contactEmail },
            }),
            prisma.profile.upsert({
                where: { id: user.id },
                update: {
                    gender,
                    bloodGroup,
                    address,
                    nationalId,
                    fatherName,
                    motherName,
                    emergencyContactName,
                    emergencyContactPhone,
                    dateOfBirth,
                },
                create: {
                    id: user.id,
                    gender,
                    bloodGroup,
                    address,
                    nationalId,
                    fatherName,
                    motherName,
                    emergencyContactName,
                    emergencyContactPhone,
                    dateOfBirth,
                }
            }),
        ]);

        revalidatePath("/portal/profile");
        revalidatePath("/portal");
        return { success: true };
    } catch (err: any) {
        if (err?.code === "P2002" && err?.meta?.target?.includes?.("national_id")) {
            return { error: "This Birth Certificate number is already registered to another member." };
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
