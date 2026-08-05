"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import {
    parseCustomDivisions,
    type CustomDivision,
} from "@/lib/tournaments/divisions";

type PresetResult =
    | { ok: true; id?: string }
    | { ok: false; error: string };

async function requireAdmin(): Promise<
    { ok: true; userId: string } | { ok: false; error: string }
> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };
    const current = await loadCurrentUser(user.id);
    if (!current || current.role !== "ADMIN") {
        return { ok: false, error: "Only admins can manage presets." };
    }
    return { ok: true, userId: user.id };
}

// Persist the current form's divisions block as a named preset.
export async function saveDivisionPresetAction(
    formData: FormData,
): Promise<PresetResult> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth;

    const name = ((formData.get("name") as string) ?? "").trim();
    if (!name) return { ok: false, error: "Preset name is required." };
    if (name.length > 120) {
        return { ok: false, error: "Preset name is too long (max 120 chars)." };
    }

    const description =
        ((formData.get("description") as string) ?? "").trim() || null;

    const raw = ((formData.get("divisions") as string) ?? "").trim();
    if (!raw) return { ok: false, error: "Preset has no divisions to save." };

    let divisions: CustomDivision[];
    try {
        divisions = parseCustomDivisions(JSON.parse(raw));
    } catch {
        return { ok: false, error: "Divisions payload is malformed." };
    }
    if (divisions.length === 0) {
        return { ok: false, error: "Add at least one division before saving." };
    }

    const created = await prisma.divisionPreset.create({
        data: {
            name,
            description,
            divisions,
            createdById: auth.userId,
        },
        select: { id: true },
    });

    revalidatePath("/portal/admin/events");
    return { ok: true, id: created.id };
}

export async function deleteDivisionPresetAction(
    formData: FormData,
): Promise<PresetResult> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth;

    const id = ((formData.get("id") as string) ?? "").trim();
    if (!id) return { ok: false, error: "Missing preset id." };

    const existing = await prisma.divisionPreset.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!existing) return { ok: false, error: "Preset not found." };

    await prisma.divisionPreset.delete({ where: { id } });
    revalidatePath("/portal/admin/events");
    return { ok: true };
}
