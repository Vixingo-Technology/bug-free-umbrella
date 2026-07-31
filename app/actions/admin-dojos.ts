"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { emitWebhook } from "@/lib/n8n";
import { notifyMembers } from "@/lib/notify";
import type { Prisma } from "@/prisma/generated/client";
import { FEATURE_KEYS, isFeatureKey } from "@/lib/dojo/feature-locks";

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseFloatOrNull(v: FormDataEntryValue | null): number | null {
    if (v === null || v === "") return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function parseNonNegativeInt(v: FormDataEntryValue | null): number {
    if (v === null || v === "") return 0;
    const n = Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}


function buildData(formData: FormData) {
    const name = ((formData.get("name") as string) ?? "").trim();
    const address = ((formData.get("address") as string) ?? "").trim() || null;
    const city = ((formData.get("city") as string) ?? "").trim() || null;
    const phone = ((formData.get("phone") as string) ?? "").trim() || null;
    const email = ((formData.get("email") as string) ?? "").trim() || null;
    const latitude = parseFloatOrNull(formData.get("latitude"));
    const longitude = parseFloatOrNull(formData.get("longitude"));
    const headInstructorId = ((formData.get("headInstructorId") as string) ?? "").trim() || null;
    const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
    const studentMilestone = parseNonNegativeInt(formData.get("studentMilestone"));

    return { name, address, city, phone, email, latitude, longitude, headInstructorId, isActive, studentMilestone };
}

/**
 * Set (or clear) the DOJO_OWNER for a dojo. Demotes any current owner to
 * INSTRUCTOR before promoting the new one so the UNIQUE(dojo_id) constraint
 * on dojo_owners is never violated.
 */
async function setDojoHead(
    tx: Prisma.TransactionClient,
    dojoId: string,
    newOwnerId: string | null
): Promise<void> {
    const current = await tx.dojoOwner.findUnique({
        where: { dojoId },
        select: { id: true },
    });

    if (current && current.id !== newOwnerId) {
        // Demote: move from dojo_owners → instructors and flip users.role_id.
        await tx.dojoOwner.delete({ where: { id: current.id } });
        await tx.instructor.upsert({
            where: { id: current.id },
            create: { id: current.id, dojoId },
            update: { dojoId },
        });
        await tx.user.update({
            where: { id: current.id },
            data: { roleId: "INSTRUCTOR" },
        });
    }

    if (newOwnerId) {
        // Promote: remove any prior role row, insert into dojo_owners.
        await tx.instructor.deleteMany({ where: { id: newOwnerId } });
        await tx.dojoManager.deleteMany({ where: { id: newOwnerId } });
        await tx.student.deleteMany({ where: { id: newOwnerId } });
        await tx.dojoOwner.upsert({
            where: { id: newOwnerId },
            create: { id: newOwnerId, dojoId },
            update: { dojoId },
        });
        await tx.user.update({
            where: { id: newOwnerId },
            data: { roleId: "DOJO_OWNER" },
        });
    }
}

export async function createDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const data = buildData(formData);
    if (!data.name) return { ok: false, error: "Name is required." };

    const dojoId = await prisma.$transaction(async (tx) => {
        const dojo = await tx.dojo.create({
            data: {
                name: data.name,
                address: data.address,
                city: data.city,
                phone: data.phone,
                email: data.email,
                latitude: data.latitude,
                longitude: data.longitude,
                isActive: data.isActive,
            },
            select: { id: true },
        });
        await setDojoHead(tx, dojo.id, data.headInstructorId);
        return dojo.id;
    });

    revalidatePath("/portal/admin/dojos");
    return { ok: true, id: dojoId };
}

export async function updateDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Dojo id is required." };
    const data = buildData(formData);
    if (!data.name) return { ok: false, error: "Name is required." };

    await prisma.$transaction(async (tx) => {
        await tx.dojo.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                city: data.city,
                phone: data.phone,
                email: data.email,
                latitude: data.latitude,
                longitude: data.longitude,
                isActive: data.isActive,
                studentMilestone: data.studentMilestone,
            },
        });
        await setDojoHead(tx, id, data.headInstructorId);
    });

    revalidatePath("/portal/admin/dojos");
    revalidatePath("/portal");
    return { ok: true };
}

export async function deleteDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Dojo id is required." };

    const memberCount = await prisma.student.count({ where: { dojoId: id } });
    if (memberCount > 0) {
        await prisma.dojo.update({ where: { id }, data: { isActive: false } });
        revalidatePath("/portal/admin/dojos");
        return { ok: false, error: `Dojo has ${memberCount} member(s) assigned. It was deactivated instead of deleted.` };
    }

    await prisma.dojo.delete({ where: { id } });
    revalidatePath("/portal/admin/dojos");
    return { ok: true };
}

/**
 * Persist the admin-controlled feature lock list for a dojo. Accepts the
 * repeated `feature=<key>` entries produced by the checkbox group; unknown
 * keys are dropped silently.
 */
export async function updateDojoLockedFeaturesAction(
    formData: FormData
): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Dojo id is required." };

    const submitted = formData.getAll("feature").map(String);
    const locked = Array.from(new Set(submitted.filter(isFeatureKey)));

    // Guard against arbitrary strings sneaking in via a crafted form.
    const invalid = submitted.find((v) => !FEATURE_KEYS.includes(v as never));
    if (invalid) {
        return { ok: false, error: `Unknown feature key: ${invalid}` };
    }

    try {
        await prisma.dojo.update({
            where: { id },
            data: { lockedFeatures: locked },
        });
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : "Could not update locks.",
        };
    }

    revalidatePath("/portal/admin/dojos");
    revalidatePath("/portal");
    return { ok: true };
}

export async function assignDojoInstructorAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    const headInstructorId = ((formData.get("headInstructorId") as string) ?? "").trim() || null;
    if (!id) return { ok: false, error: "Dojo id is required." };

    await prisma.$transaction((tx) => setDojoHead(tx, id, headInstructorId));

    revalidatePath("/portal/admin/dojos");
    return { ok: true };
}

/**
 * Fire a `jka.renewal.reminder` n8n webhook so the automation workflow on
 * Hetzner sends the dojo owner an email (and WhatsApp) reminder to renew.
 * The actual send is owned by n8n — this server action just hands it the
 * dojo and recipient context.
 */
export async function sendDojoRenewalReminderAction(input: {
    dojoId: string;
}): Promise<ActionResult> {
    await requireAdmin();
    if (!input.dojoId) return { ok: false, error: "Dojo id is required." };

    const dojo = await prisma.dojo.findUnique({
        where: { id: input.dojoId },
        include: {
            owner: {
                include: {
                    user: { select: { id: true, fullName: true, email: true, phone: true } },
                },
            },
        },
    });
    if (!dojo) return { ok: false, error: "Dojo not found." };

    const owner = dojo.owner?.user ?? null;
    const recipient = owner?.email ?? dojo.email;
    if (!recipient) {
        return {
            ok: false,
            error: "No owner email on file — set a head instructor or a public dojo email first.",
        };
    }

    // Compute days-left so the reminder body — both email and in-app — can
    // quote a concrete deadline ("30 days left" / "expired 5 days ago") rather
    // than a bare date.
    const daysLeft = dojo.expiryDate
        ? Math.ceil(
              (dojo.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
        : null;
    const expiryLabel = dojo.expiryDate ? fmtDate.format(dojo.expiryDate) : null;
    const urgencyPhrase =
        daysLeft === null
            ? "Please renew your dojo membership."
            : daysLeft < 0
                ? `Your dojo membership expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago${expiryLabel ? ` (on ${expiryLabel})` : ""}. Please renew to restore your public listing.`
                : daysLeft === 0
                    ? `Your dojo membership expires today${expiryLabel ? ` (${expiryLabel})` : ""}. Please renew today to avoid interruption.`
                    : `Your dojo membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}${expiryLabel ? ` (on ${expiryLabel})` : ""}. Please renew soon.`;

    await emitWebhook("jka.renewal.reminder", {
        kind: "dojo",
        dojoId: dojo.id,
        dojoName: dojo.name,
        recipientEmail: recipient,
        recipientName: owner?.fullName ?? dojo.name,
        recipientPhone: owner?.phone ?? null,
        expiryDate: dojo.expiryDate?.toISOString() ?? null,
        daysLeft,
        message: urgencyPhrase,
        annualFee: dojo.annualFee != null ? Number(dojo.annualFee) : null,
        renewUrl: "/portal/dojo/renewals",
    });

    // In-app notification for the dojo owner — same body as the email so the
    // owner sees a consistent message in the bell dropdown.
    if (owner?.id) {
        await notifyMembers([owner.id], {
            title:
                daysLeft !== null && daysLeft < 0
                    ? "Dojo membership expired"
                    : "Renew your dojo membership",
            message: urgencyPhrase,
            type: "PAYMENT",
            link: "/portal/dojo/renewals",
        });
    }

    return { ok: true };
}
