"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";

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
