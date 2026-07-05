"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { notifyMembers } from "@/lib/notify";

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
            // 1. Reuse the pre-created Dojo when present (enlistment flow
            //    now creates the row upfront so trainer invites can point at
            //    a real id). Fall back to creating it here for legacy
            //    applications submitted before that change.
            let dojoId = application.dojoId;
            if (!dojoId) {
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
                dojoId = dojo.id;
            } else {
                await tx.dojo.update({
                    where: { id: dojoId },
                    data: { isActive: true },
                });
            }

            // 2. Upsert the applicant as DOJO_OWNER of the (now approved) dojo.
            await tx.user.upsert({
                where: { id: application.userId! },
                update: {
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    roleId: "DOJO_OWNER",
                },
                create: {
                    id: application.userId!,
                    fullName: application.contactName,
                    email: application.email,
                    phone: application.phone,
                    roleId: "DOJO_OWNER",
                    isActive: true,
                },
            });
            await tx.student.deleteMany({ where: { id: application.userId! } });
            await tx.instructor.deleteMany({ where: { id: application.userId! } });
            await tx.dojoManager.deleteMany({ where: { id: application.userId! } });
            await tx.dojoOwner.upsert({
                where: { id: application.userId! },
                create: { id: application.userId!, dojoId },
                update: { dojoId },
            });

            // 3. Mark the application approved with the dojo id.
            await tx.dojoApplication.update({
                where: { id: application.id },
                data: {
                    status: "APPROVED",
                    dojoId,
                    paymentId: application.paymentId ?? `approved:${dojoId}`,
                },
            });
        });
    } catch (e) {
        const message =
            e instanceof Error ? e.message : "Approval failed.";
        return { ok: false, error: message };
    }

    if (application.userId) {
        await notifyMembers([application.userId], {
            title: "Your dojo is approved",
            message: `${application.dojoName} is now active in the federation. Open your dojo console to get started.`,
            type: "SUCCESS",
            link: "/portal",
        });
    }

    revalidatePath("/portal/admin/dojos/applications");
    revalidatePath("/portal/admin/dojos");
    revalidatePath("/portal");
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
        select: { status: true, userId: true, dojoName: true },
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

    if (application.userId) {
        await notifyMembers([application.userId], {
            title: "Dojo enlistment not approved",
            message: `Your application for ${application.dojoName} was not approved at this time. Please contact the federation for details.`,
            type: "WARNING",
            link: null,
        });
    }

    revalidatePath("/portal/admin/dojos/applications");
    return { ok: true };
}
