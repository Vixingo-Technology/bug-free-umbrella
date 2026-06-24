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
 *   - Upserts the applicant's Member row with role DOJO_OWNER and dojoId
 *     pointing at the new Dojo.
 *   - Creates the Dojo (the partial unique index on members(dojoId) WHERE
 *     role='DOJO_OWNER' enforces "at most one head per dojo").
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
            // 1. Create the Dojo first so we have an id to assign as the
            //    owner's dojoId in step 2.
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
                },
                select: { id: true },
            });

            // 2. Upsert the applicant as DOJO_OWNER of the new dojo.
            //    The partial unique index members_one_owner_per_dojo guarantees
            //    we won't end up with two owners on the same dojo.
            await tx.member.upsert({
                where: { id: application.userId! },
                update: {
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    role: "DOJO_OWNER",
                    dojoId: dojo.id,
                },
                create: {
                    id: application.userId!,
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    role: "DOJO_OWNER",
                    dojoId: dojo.id,
                    isActive: true,
                    membershipStatus: "ACTIVE",
                },
            });

            // 3. Mark the application approved with the dojo id.
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
