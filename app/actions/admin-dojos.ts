"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { emitWebhook } from "@/lib/n8n";
import type { Prisma } from "@/prisma/generated/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseFloatOrNull(v: FormDataEntryValue | null): number | null {
    if (v === null || v === "") return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function parseSchedule(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try { return JSON.parse(trimmed); }
    catch { return raw; } // fall back to plain text if not JSON
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
    const scheduleRaw = ((formData.get("schedule") as string) ?? "");
    const schedule = parseSchedule(scheduleRaw);

    return { name, address, city, phone, email, latitude, longitude, headInstructorId, isActive, schedule };
}

/**
 * Set (or clear) the DOJO_OWNER for a dojo. Demotes any current owner to
 * INSTRUCTOR before promoting the new one so the partial unique index
 * `members_one_owner_per_dojo` is never violated.
 */
async function setDojoHead(
    tx: Prisma.TransactionClient,
    dojoId: string,
    newOwnerId: string | null
): Promise<void> {
    const current = await tx.member.findFirst({
        where: { dojoId, role: "DOJO_OWNER" },
        select: { id: true },
    });

    if (current && current.id !== newOwnerId) {
        await tx.member.update({
            where: { id: current.id },
            data: { role: "INSTRUCTOR" },
        });
    }

    if (newOwnerId) {
        await tx.member.update({
            where: { id: newOwnerId },
            data: { role: "DOJO_OWNER", dojoId },
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
                schedule: data.schedule as never,
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
                schedule: data.schedule as never,
            },
        });
        await setDojoHead(tx, id, data.headInstructorId);
    });

    revalidatePath("/portal/admin/dojos");
    return { ok: true };
}

export async function deleteDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Dojo id is required." };

    const memberCount = await prisma.member.count({ where: { dojoId: id } });
    if (memberCount > 0) {
        await prisma.dojo.update({ where: { id }, data: { isActive: false } });
        revalidatePath("/portal/admin/dojos");
        return { ok: false, error: `Dojo has ${memberCount} member(s) assigned. It was deactivated instead of deleted.` };
    }

    await prisma.dojo.delete({ where: { id } });
    revalidatePath("/portal/admin/dojos");
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
            members: {
                where: { role: "DOJO_OWNER" },
                select: { id: true, fullName: true, email: true, phone: true },
                take: 1,
            },
        },
    });
    if (!dojo) return { ok: false, error: "Dojo not found." };

    const owner = dojo.members[0];
    const recipient = owner?.email ?? dojo.email;
    if (!recipient) {
        return {
            ok: false,
            error: "No owner email on file — set a head instructor or a public dojo email first.",
        };
    }

    await emitWebhook("jka.renewal.reminder", {
        kind: "dojo",
        dojoId: dojo.id,
        dojoName: dojo.name,
        recipientEmail: recipient,
        recipientName: owner?.fullName ?? dojo.name,
        recipientPhone: owner?.phone ?? null,
        expiryDate: dojo.expiryDate?.toISOString() ?? null,
        annualFee: dojo.annualFee != null ? Number(dojo.annualFee) : null,
        renewUrl: "/portal/dojo/settings#renewal",
    });

    return { ok: true };
}
