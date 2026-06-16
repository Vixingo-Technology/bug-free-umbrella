"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

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

export async function createDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const data = buildData(formData);
    if (!data.name) return { ok: false, error: "Name is required." };

    const dojo = await prisma.dojo.create({
        data: {
            name: data.name,
            address: data.address,
            city: data.city,
            phone: data.phone,
            email: data.email,
            latitude: data.latitude,
            longitude: data.longitude,
            headInstructorId: data.headInstructorId,
            isActive: data.isActive,
            schedule: data.schedule as never,
        },
    });

    revalidatePath("/portal/admin/dojos");
    return { ok: true, id: dojo.id };
}

export async function updateDojoAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Dojo id is required." };
    const data = buildData(formData);
    if (!data.name) return { ok: false, error: "Name is required." };

    await prisma.dojo.update({
        where: { id },
        data: {
            name: data.name,
            address: data.address,
            city: data.city,
            phone: data.phone,
            email: data.email,
            latitude: data.latitude,
            longitude: data.longitude,
            headInstructorId: data.headInstructorId,
            isActive: data.isActive,
            schedule: data.schedule as never,
        },
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

    await prisma.dojo.update({
        where: { id },
        data: { headInstructorId },
    });

    revalidatePath("/portal/admin/dojos");
    return { ok: true };
}
