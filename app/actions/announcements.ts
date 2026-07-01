"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachmentIfPresent } from "@/lib/attachment-upload";
import { loadCurrentUser } from "@/lib/auth/load-current-user";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Resolve who is acting, and what they're allowed to post to.
 * Returns `dojoId` for DOJO_OWNER (their dojo) or `null` for ADMIN (federation-wide).
 */
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
    revalidatePath("/portal/admin/announcements");
    revalidatePath("/portal/dojo/announcements");
}

export async function createAnnouncementAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const title = ((formData.get("title") as string) ?? "").trim();
    const body = ((formData.get("body") as string) ?? "").trim() || null;
    const link = ((formData.get("link") as string) ?? "").trim() || null;
    const isPublished = formData.get("isPublished") !== "false";

    if (!title) return { ok: false, error: "Title is required." };

    let attachment: { url: string; type: "IMAGE" | "PDF" } | null;
    try {
        attachment = await uploadAttachmentIfPresent(formData.get("attachment"));
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Upload failed.",
        };
    }

    const created = await prisma.announcement.create({
        data: {
            title,
            body,
            link,
            isPublished,
            attachmentUrl: attachment?.url ?? null,
            attachmentType: attachment?.type ?? null,
            postedById: auth.userId,
            dojoId: auth.dojoId, // null for ADMIN (federation-wide)
        },
    });

    revalidateAll();
    return { ok: true, id: created.id };
}

export async function deleteAnnouncementAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing announcement id." };

    const existing = await prisma.announcement.findUnique({
        where: { id },
        select: { dojoId: true, postedById: true },
    });
    if (!existing) return { ok: false, error: "Announcement not found." };

    // Admins can delete anything. Dojo owners can only delete announcements
    // belonging to their dojo.
    if (auth.role === "DOJO_OWNER" && existing.dojoId !== auth.dojoId) {
        return { ok: false, error: "You can only delete your own dojo's announcements." };
    }

    await prisma.announcement.delete({ where: { id } });

    revalidateAll();
    return { ok: true };
}

export async function toggleAnnouncementPublishedAction(
    formData: FormData,
): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = formData.get("id") as string;
    const next = formData.get("isPublished") === "true";
    if (!id) return { ok: false, error: "Missing announcement id." };

    const existing = await prisma.announcement.findUnique({
        where: { id },
        select: { dojoId: true },
    });
    if (!existing) return { ok: false, error: "Announcement not found." };

    if (auth.role === "DOJO_OWNER" && existing.dojoId !== auth.dojoId) {
        return { ok: false, error: "Not allowed." };
    }

    await prisma.announcement.update({
        where: { id },
        data: { isPublished: next },
    });

    revalidateAll();
    return { ok: true };
}
