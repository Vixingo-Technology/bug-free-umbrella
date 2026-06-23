"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Promote a DojoApplication into a real Dojo.
 *
 * Idempotency: if the application already has a linked Dojo it returns
 * without touching the DB a second time.
 *
 * Side effects:
 *   - Upserts the applicant's Member row (role INSTRUCTOR; the application's
 *     contact person is treated as the dojo's head instructor).
 *   - Creates the Dojo with headInstructorId = member.id.
 *   - Upserts an Instructor row tying the member to the dojo.
 *   - Marks the application APPROVED and stores the new dojo's id.
 */
export async function approveDojoApplicationAction(
    formData: FormData
): Promise<Result> {
    await requireAdmin();

    const applicationId = ((formData.get("applicationId") as string) ?? "").trim();
    if (!applicationId) {
        return { ok: false, error: "Missing application id." };
    }

    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
    });
    if (!application) {
        return { ok: false, error: "Application not found." };
    }
    if (application.status === "APPROVED") {
        revalidatePath("/portal/admin/dojos/applications");
        revalidatePath("/portal/admin/dojos");
        return { ok: true };
    }
    if (application.status === "REJECTED") {
        return {
            ok: false,
            error: "This application was rejected and cannot be approved.",
        };
    }
    if (!application.userId) {
        return {
            ok: false,
            error: "Application has no Supabase user attached.",
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Upsert the head-instructor Member row.
            const member = await tx.member.upsert({
                where: { id: application.userId! },
                update: {
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    role: "INSTRUCTOR",
                },
                create: {
                    id: application.userId!,
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    role: "INSTRUCTOR",
                    isActive: true,
                    membershipStatus: "ACTIVE",
                },
            });

            // 2. Create the Dojo.
            const dojo = await tx.dojo.create({
                data: {
                    name: application.dojoName,
                    address: application.address,
                    city: null,
                    phone: application.phone,
                    email: application.email,
                    latitude: application.latitude,
                    longitude: application.longitude,
                    isActive: true,
                    headInstructorId: member.id,
                },
                select: { id: true },
            });

            // 3. Attach the head instructor to the dojo and create the
            //    Instructor profile row.
            await tx.member.update({
                where: { id: member.id },
                data: { dojoId: dojo.id },
            });
            await tx.instructor.upsert({
                where: { memberId: member.id },
                update: { dojoId: dojo.id, isActive: true },
                create: {
                    memberId: member.id,
                    dojoId: dojo.id,
                    isActive: true,
                },
            });

            // 4. Mark the application approved with the dojo id.
            await tx.dojoApplication.update({
                where: { id: application.id },
                data: {
                    status: "APPROVED",
                    paymentId: application.paymentId ?? `approved:${dojo.id}`,
                },
            });
        });
    } catch (e) {
        const message =
            e instanceof Error ? e.message : "Approval failed.";
        return { ok: false, error: message };
    }

    revalidatePath("/portal/admin/dojos/applications");
    revalidatePath("/portal/admin/dojos");
    revalidatePath("/dojo/dashboard");
    return { ok: true };
}

export async function rejectDojoApplicationAction(
    formData: FormData
): Promise<Result> {
    await requireAdmin();

    const applicationId = ((formData.get("applicationId") as string) ?? "").trim();
    if (!applicationId) {
        return { ok: false, error: "Missing application id." };
    }

    const application = await prisma.dojoApplication.findUnique({
        where: { id: applicationId },
        select: { status: true },
    });
    if (!application) {
        return { ok: false, error: "Application not found." };
    }
    if (application.status === "APPROVED") {
        return {
            ok: false,
            error: "This application is already approved.",
        };
    }

    try {
        await prisma.dojoApplication.update({
            where: { id: applicationId },
            data: { status: "REJECTED" },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Rejection failed.";
        return { ok: false, error: message };
    }

    revalidatePath("/portal/admin/dojos/applications");
    return { ok: true };
}
