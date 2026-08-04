"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachmentIfPresent } from "@/lib/attachment-upload";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import {
    isCustomDivisionCode,
    makeCustomDivisionCode,
    parseCustomDivisions,
    type CustomDivision,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";
import type { EventCategory } from "@/prisma/generated/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const CATEGORIES = [
    "SEMINAR",
    "TRAINING_CAMP",
    "TOURNAMENT",
] as const satisfies readonly EventCategory[];

function isCategory(v: unknown): v is EventCategory {
    return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

type DivisionInput =
    | {
          divisions: CustomDivision[];
          enabledTypes: TournamentEventType[];
          registrationDeadline: Date | null;
          weighInDate: Date | null;
          rulesUrl: string | null;
          isPremium: boolean;
      }
    | { error: string };

// Parse the divisions block from the form. Divisions are always admin-defined
// (no WKF presets). At least one division is required; each row supplies its
// own optional min age / min belt / price.
async function parseDivisionFields(formData: FormData): Promise<DivisionInput> {
    const raw = ((formData.get("customDivisions") as string) ?? "").trim();
    if (!raw) return { error: "Add at least one division for this event." };

    let parsed: CustomDivision[];
    try {
        parsed = parseCustomDivisions(JSON.parse(raw));
    } catch {
        return { error: "Divisions payload is malformed." };
    }
    if (parsed.length === 0) {
        return { error: "Add at least one division for this event." };
    }

    // Belt rank ids must exist. Collect once and validate against the set.
    const rankIds = Array.from(
        new Set(parsed.map((d) => d.minRankId).filter((x): x is string => !!x)),
    );
    if (rankIds.length > 0) {
        const found = await prisma.beltRank.findMany({
            where: { id: { in: rankIds } },
            select: { id: true },
        });
        const foundIds = new Set(found.map((r) => r.id));
        for (const id of rankIds) {
            if (!foundIds.has(id)) {
                return { error: "One or more selected belt ranks were not found." };
            }
        }
    }

    const seen = new Set<string>();
    const normalised: CustomDivision[] = [];
    for (const d of parsed) {
        const label = d.label.trim();
        if (!label) continue;
        const code =
            d.code && isCustomDivisionCode(d.code)
                ? d.code
                : makeCustomDivisionCode(label, d.eventType);
        if (seen.has(code)) {
            return {
                error: `Two divisions share the same name/type ("${label}"). Rename one.`,
            };
        }
        seen.add(code);
        if (d.minAge !== null && (d.minAge < 1 || d.minAge > 100)) {
            return {
                error: `Minimum age for "${label}" must be between 1 and 100.`,
            };
        }
        if (d.priceBdt !== null && d.priceBdt < 0) {
            return {
                error: `Price for "${label}" cannot be negative.`,
            };
        }
        normalised.push({
            code,
            label,
            eventType: d.eventType,
            gender: d.gender,
            isTeam: d.isTeam,
            minAge: d.minAge,
            minRankId: d.minRankId,
            priceBdt: d.priceBdt !== null ? Math.round(d.priceBdt * 100) / 100 : null,
        });
    }
    if (normalised.length === 0) {
        return { error: "Add at least one division for this event." };
    }

    const enabledTypes = Array.from(
        new Set(normalised.map((d) => d.eventType)),
    );
    const isPremium = normalised.some(
        (d) => d.priceBdt !== null && d.priceBdt > 0,
    );

    const deadlineRaw = ((formData.get("registrationDeadline") as string) ?? "").trim();
    let registrationDeadline: Date | null = null;
    if (deadlineRaw) {
        const d = new Date(deadlineRaw);
        if (Number.isNaN(d.getTime())) {
            return { error: "Invalid registration deadline." };
        }
        registrationDeadline = d;
    }

    const weighInRaw = ((formData.get("weighInDate") as string) ?? "").trim();
    let weighInDate: Date | null = null;
    if (weighInRaw && enabledTypes.includes("KUMITE")) {
        const d = new Date(weighInRaw);
        if (Number.isNaN(d.getTime())) {
            return { error: "Invalid weigh-in date." };
        }
        weighInDate = d;
    }

    const rulesUrl = ((formData.get("rulesUrl") as string) ?? "").trim() || null;

    return {
        divisions: normalised,
        enabledTypes,
        registrationDeadline,
        weighInDate,
        rulesUrl,
        isPremium,
    };
}

async function requirePoster(): Promise<
    | { ok: true; userId: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const current = await loadCurrentUser(user.id);
    if (!current) return { ok: false, error: "Account not found." };

    if (current.role !== "ADMIN") {
        return { ok: false, error: "Only admins can post events." };
    }
    return { ok: true, userId: user.id };
}

function revalidateAll() {
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/portal/admin/events");
}

type ParsedCommon = {
    title: string;
    description: string | null;
    location: string | null;
    eventDate: Date;
    category: EventCategory;
    maxCapacity: number | null;
    memberDiscountPercent: number;
    multiDivisionBundlePriceBdt: number | null;
};

function parseCommonFields(
    formData: FormData,
): { ok: true; value: ParsedCommon } | { ok: false; error: string } {
    const title = ((formData.get("title") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim() || null;
    const location = ((formData.get("location") as string) ?? "").trim() || null;
    const eventDateStr = ((formData.get("eventDate") as string) ?? "").trim();
    const categoryRaw = formData.get("category");
    const maxCapacityRaw = ((formData.get("maxCapacity") as string) ?? "").trim();

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
    let memberDiscountPercent = 0;
    const discountRaw = ((formData.get("memberDiscountPercent") as string) ?? "").trim();
    if (discountRaw) {
        const d = Number.parseInt(discountRaw, 10);
        if (!Number.isFinite(d) || d < 0 || d > 100) {
            return {
                ok: false,
                error: "Member discount must be a whole number between 0 and 100.",
            };
        }
        memberDiscountPercent = d;
    }

    let multiDivisionBundlePriceBdt: number | null = null;
    const bundleRaw = ((formData.get("multiDivisionBundlePriceBdt") as string) ?? "").trim();
    if (bundleRaw) {
        const b = Number.parseFloat(bundleRaw);
        if (!Number.isFinite(b) || b < 0) {
            return {
                ok: false,
                error: "Multi-division bundle price must be a positive number.",
            };
        }
        multiDivisionBundlePriceBdt = Math.round(b * 100) / 100;
    }

    return {
        ok: true,
        value: {
            title,
            description,
            location,
            eventDate,
            category: categoryRaw,
            maxCapacity,
            memberDiscountPercent,
            multiDivisionBundlePriceBdt,
        },
    };
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const parsed = parseCommonFields(formData);
    if (!parsed.ok) return parsed;
    const isPublished = formData.get("isPublished") !== "false";

    let attachment: { url: string; type: "IMAGE" | "PDF" } | null;
    try {
        attachment = await uploadAttachmentIfPresent(formData.get("attachment"));
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Upload failed.",
        };
    }

    const divisions = await parseDivisionFields(formData);
    if ("error" in divisions) return { ok: false, error: divisions.error };

    const {
        title,
        description,
        location,
        eventDate,
        category,
        maxCapacity,
        memberDiscountPercent,
        multiDivisionBundlePriceBdt,
    } = parsed.value;

    const created = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                title,
                description,
                location,
                eventDate,
                category,
                maxCapacity,
                isPublished,
                // Event-level fields are unused now that pricing lives on
                // each division; kept nullable in the schema.
                isPremium: divisions.isPremium,
                ticketPrice: multiDivisionBundlePriceBdt,
                memberDiscountPercent,
                minAge: null,
                minRankId: null,
                participantType: "PUBLIC",
                attachmentUrl: attachment?.url ?? null,
                attachmentType: attachment?.type ?? null,
                postedById: auth.userId,
                dojoId: null,
            },
        });
        await tx.tournamentDetail.create({
            data: {
                eventId: event.id,
                eventType: divisions.enabledTypes[0],
                enabledTypes: divisions.enabledTypes,
                enabledDivisions: divisions.divisions.map((d) => d.code),
                customDivisions: divisions.divisions,
                registrationDeadline: divisions.registrationDeadline,
                weighInDate: divisions.weighInDate,
                rulesUrl: divisions.rulesUrl,
            },
        });
        return event;
    });

    revalidateAll();
    return { ok: true, id: created.id };
}

export async function updateEventAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = ((formData.get("id") as string) ?? "").trim();
    if (!id) return { ok: false, error: "Missing event id." };

    const existing = await prisma.event.findUnique({
        where: { id },
        select: { id: true, attachmentUrl: true, attachmentType: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    const parsed = parseCommonFields(formData);
    if (!parsed.ok) return parsed;
    const isPublished = formData.get("isPublished") !== "false";

    let attachment: { url: string; type: "IMAGE" | "PDF" } | null;
    try {
        attachment = await uploadAttachmentIfPresent(formData.get("attachment"));
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Upload failed.",
        };
    }

    const divisions = await parseDivisionFields(formData);
    if ("error" in divisions) return { ok: false, error: divisions.error };

    const {
        title,
        description,
        location,
        eventDate,
        category,
        maxCapacity,
        memberDiscountPercent,
        multiDivisionBundlePriceBdt,
    } = parsed.value;

    await prisma.$transaction(async (tx) => {
        await tx.event.update({
            where: { id },
            data: {
                title,
                description,
                location,
                eventDate,
                category,
                maxCapacity,
                isPublished,
                isPremium: divisions.isPremium,
                ticketPrice: multiDivisionBundlePriceBdt,
                memberDiscountPercent,
                minAge: null,
                minRankId: null,
                participantType: "PUBLIC",
                ...(attachment
                    ? { attachmentUrl: attachment.url, attachmentType: attachment.type }
                    : {}),
            },
        });
        await tx.tournamentDetail.upsert({
            where: { eventId: id },
            update: {
                eventType: divisions.enabledTypes[0],
                enabledTypes: divisions.enabledTypes,
                enabledDivisions: divisions.divisions.map((d) => d.code),
                customDivisions: divisions.divisions,
                registrationDeadline: divisions.registrationDeadline,
                weighInDate: divisions.weighInDate,
                rulesUrl: divisions.rulesUrl,
            },
            create: {
                eventId: id,
                eventType: divisions.enabledTypes[0],
                enabledTypes: divisions.enabledTypes,
                enabledDivisions: divisions.divisions.map((d) => d.code),
                customDivisions: divisions.divisions,
                registrationDeadline: divisions.registrationDeadline,
                weighInDate: divisions.weighInDate,
                rulesUrl: divisions.rulesUrl,
            },
        });
    });

    revalidateAll();
    revalidatePath(`/events/${id}`);
    return { ok: true, id };
}

export async function deleteEventAction(formData: FormData): Promise<ActionResult> {
    const auth = await requirePoster();
    if (!auth.ok) return auth;

    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Missing event id." };

    const existing = await prisma.event.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

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
        select: { id: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    await prisma.event.update({
        where: { id },
        data: { isPublished: next },
    });

    revalidateAll();
    return { ok: true };
}
