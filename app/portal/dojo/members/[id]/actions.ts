"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { isValidPhone } from "@/lib/validation/phone";

export async function updateStudentGenderAction(formData: FormData) {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) return { error: "No dojo in session." };

    const studentId = (formData.get("studentId") as string)?.trim();
    const genderRaw = ((formData.get("gender") as string) ?? "").trim();

    if (!studentId) return { error: "Missing student." };
    let gender: "MALE" | "FEMALE" | null;
    if (genderRaw === "MALE" || genderRaw === "FEMALE") {
        gender = genderRaw;
    } else if (genderRaw === "") {
        gender = null;
    } else {
        return { error: "Invalid gender." };
    }

    const student = await prisma.student.findFirst({
        where: { id: studentId, dojoId: session.dojo.id },
        select: { id: true },
    });
    if (!student) return { error: "Student not found in your dojo." };

    try {
        await prisma.profile.upsert({
            where: { id: studentId },
            update: { gender },
            create: { id: studentId, gender },
        });
        revalidatePath(`/portal/dojo/members/${studentId}`);
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to update gender." };
    }
}

export async function updateStudentProfileAction(formData: FormData) {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) return { error: "No dojo in session." };

    const studentId = (formData.get("studentId") as string)?.trim();
    if (!studentId) return { error: "Missing student." };

    const student = await prisma.student.findFirst({
        where: { id: studentId, dojoId: session.dojo.id },
        select: { id: true },
    });
    if (!student) return { error: "Student not found in your dojo." };

    const s = (k: string) => ((formData.get(k) as string) ?? "").trim();

    const fullName = s("fullName");
    if (!fullName) return { error: "Full name is required." };

    const phone = s("phone") || null;
    if (phone && !isValidPhone(phone)) {
        return { error: "Phone must be exactly 11 digits." };
    }

    const contactEmailRaw = s("contactEmail");
    const contactEmail = contactEmailRaw || null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return { error: "Enter a valid contact email address." };
    }

    const genderRaw = s("gender");
    const gender: "MALE" | "FEMALE" | null =
        genderRaw === "MALE" || genderRaw === "FEMALE" ? genderRaw : null;

    const bloodGroupRaw = s("bloodGroup");
    const bloodGroup = bloodGroupRaw || null;

    const address = s("address") || null;
    const nationalId = s("nationalId") || null;
    const fatherName = s("fatherName") || null;
    const motherName = s("motherName") || null;
    const emergencyContactName = s("emergencyContactName") || null;
    const emergencyContactPhone = s("emergencyContactPhone") || null;

    if (emergencyContactPhone && !isValidPhone(emergencyContactPhone)) {
        return { error: "Emergency contact phone must be exactly 11 digits." };
    }

    const dobRaw = s("dateOfBirth");
    const dateOfBirth = dobRaw ? new Date(dobRaw) : null;
    if (dobRaw && Number.isNaN(dateOfBirth?.getTime())) {
        return { error: "Invalid date of birth." };
    }

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: studentId },
                data: { fullName, phone, contactEmail },
            }),
            prisma.profile.upsert({
                where: { id: studentId },
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
                    id: studentId,
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
            }),
        ]);
        revalidatePath(`/portal/dojo/members/${studentId}`);
        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to update profile." };
    }
}
