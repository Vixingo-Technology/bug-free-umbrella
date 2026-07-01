"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachmentIfPresent } from "@/lib/attachment-upload";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import type { EventCategory } from "@/prisma/generated/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const CATEGORIES = [
    "BELT_TEST",
    "TOURNAMENT",
    "SEMINAR",
    "TRAINING_CAMP",
    "OTHER",
] as const satisfies readonly EventCategory[];

function isCategory(v: unknown): v is EventCategory {
    return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

async function requirePoster(): Promise<
    | { ok: true; userId: string; role: "ADMIN" | "DOJO_OWNER"; dojoId: string | null }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const current = await loadCurrentUser(user.id);
    if (!current) return { ok: false, error: "Account not found." };

    if (current.role === "ADMIN") {
        return { ok: true, userId: user.id, role: "ADMIN", dojoId: null };
    }
    if (current.role === "DOJO_OWNER") {
        if (!current.dojoId) {
            return { ok: false, error: "Your dojo is not yet approved." };
        }
        return { ok: true, userId: user.id, role: "DOJO_OWNER", dojoId: current.dojoId };
    }
    return { ok: false, error: "Only admins and dojo owners can post." };
}

function revalidateAll() {
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/portal/admin/events");
    revalidatePath("/portal/dojo/events");
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const title = ((formData.get("title") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim() || null;
    const location = ((formData.get("location") as string) ?? "").trim() || null;
    const eventDateStr = ((formData.get("eventDate") as string) ?? "").trim();
    const categoryRaw = formData.get("category");
    const maxCapacityRaw = ((formData.get("maxCapacity") as string) ?? "").trim();
    const isPublished = formData.get("isPublished") !== "false";

    if (!title) return { ok: false, error: "Title is required." };
    if (!eventDateStr) return { ok: false, error: "Event date is required." };
    const eventDate = new Date(eventDateStr);
    if (Number.isNaN(eventDate.getTime())) {
        return { ok: false, error: "Invalid date." };
    }
    if (!isCategory(categoryRaw)) {
        return { ok: false, error: "Invalid category." };
    }
    let maxCapacity: number | null = null;
    if (maxCapacityRaw) {
        const n = Number.parseInt(maxCapacityRaw, 10);
        if (!Number.isFinite(n) || n < 0) {
            return { ok: false, error: "Capacity must be a positive number." };
        }
        maxCapacity = n;
    }

    let attachment: { url: string; type: "IMAGE" | "PDF" } | null;
    try {
        attachment = await uploadAttachmentIfPresent(formData.get("attachment"));
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Upload failed.",
        };
    }

    const created = await prisma.event.create({
        data: {
            title,
            description,
            location,
            eventDate,
            category: categoryRaw,
            maxCapacity,
            isPublished,
            attachmentUrl: attachment?.url ?? null,
            attachmentType: attachment?.type ?? null,
            postedById: auth.userId,
            dojoId: auth.dojoId,
        },
    });

    revalidateAll();
    return { ok: true, id: created.id };
}

export async function deleteEventAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing event id." };

    const existing = await prisma.event.findUnique({
        where: { id },
        select: { dojoId: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    if (auth.role === "DOJO_OWNER" && existing.dojoId !== auth.dojoId) {
        return { ok: false, error: "You can only delete your own dojo's events." };
    }

    await prisma.event.delete({ where: { id } });

    revalidateAll();
    return { ok: true };
}

export async function toggleEventPublishedAction(
    formData: FormData,
): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = formData.get("id") as string;
    const next = formData.get("isPublished") === "true";
    if (!id) return { ok: false, error: "Missing event id." };

    const existing = await prisma.event.findUnique({
        where: { id },
        select: { dojoId: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    if (auth.role === "DOJO_OWNER" && existing.dojoId !== auth.dojoId) {
        return { ok: false, error: "Not allowed." };
    }

    await prisma.event.update({
        where: { id },
        data: { isPublished: next },
    });

    revalidateAll();
    return { ok: true };
}
