"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachmentIfPresent } from "@/lib/attachment-upload";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import { notifyMembers, type NotifyPayload } from "@/lib/notify";
import { findUserIdsByRoles } from "@/lib/notify/recipients";
import type { Prisma } from "@/prisma/generated/client";
import {
    isCustomDivisionCode,
    makeCustomDivisionCode,
    parseCustomDivisions,
    sumRequiredFees,
    type CustomDivision,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";
import { coerceDiscountType, type DiscountType } from "@/lib/pricing/discount";
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

// Parse the divisions block from the form. Divisions are admin-defined and
// entirely optional — an event may publish with zero divisions, in which
// case participants register for the event ticket alone.
async function parseDivisionFields(formData: FormData): Promise<DivisionInput> {
    const raw = ((formData.get("customDivisions") as string) ?? "").trim();

    let parsed: CustomDivision[] = [];
    if (raw) {
        try {
            parsed = parseCustomDivisions(JSON.parse(raw));
        } catch {
            return { error: "Divisions payload is malformed." };
        }
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
        if (d.maxAge !== null && (d.maxAge < 1 || d.maxAge > 100)) {
            return {
                error: `Maximum age for "${label}" must be between 1 and 100.`,
            };
        }
        if (
            d.minAge !== null &&
            d.maxAge !== null &&
            d.minAge > d.maxAge
        ) {
            return {
                error: `"${label}" minimum age cannot exceed maximum age.`,
            };
        }
        if (
            d.minWeightKg !== null &&
            (!Number.isFinite(d.minWeightKg) ||
                d.minWeightKg < 0 ||
                d.minWeightKg > 500)
        ) {
            return {
                error: `Minimum weight for "${label}" must be between 0 and 500 kg.`,
            };
        }
        if (
            d.maxWeightKg !== null &&
            (!Number.isFinite(d.maxWeightKg) ||
                d.maxWeightKg < 0 ||
                d.maxWeightKg > 500)
        ) {
            return {
                error: `Maximum weight for "${label}" must be between 0 and 500 kg.`,
            };
        }
        if (
            d.minWeightKg !== null &&
            d.maxWeightKg !== null &&
            d.minWeightKg > d.maxWeightKg
        ) {
            return {
                error: `"${label}" minimum weight cannot exceed maximum weight.`,
            };
        }
        if (d.priceBdt !== null && d.priceBdt < 0) {
            return {
                error: `Price for "${label}" cannot be negative.`,
            };
        }
        // Validate fees. Names must be non-empty; amounts must be >= 0.
        const feeNames = new Set<string>();
        for (const f of d.fees ?? []) {
            const fname = f.name.trim();
            if (!fname) {
                return {
                    error: `Every fee on "${label}" needs a name.`,
                };
            }
            if (feeNames.has(fname.toLowerCase())) {
                return {
                    error: `"${label}" has two fees named "${fname}". Rename one.`,
                };
            }
            feeNames.add(fname.toLowerCase());
            if (!Number.isFinite(f.amountBdt) || f.amountBdt < 0) {
                return {
                    error: `Fee "${fname}" on "${label}" must be a positive amount.`,
                };
            }
            if (!Number.isFinite(f.memberDiscountValue) || f.memberDiscountValue < 0) {
                return {
                    error: `Member discount on "${fname}" (${label}) must be a non-negative number.`,
                };
            }
            if (
                f.memberDiscountType === "PERCENT" &&
                f.memberDiscountValue > 100
            ) {
                return {
                    error: `Member discount % on "${fname}" (${label}) must be between 0 and 100.`,
                };
            }
        }
        const cleanedFees = (d.fees ?? []).map((f) => {
            const clampedValue =
                f.memberDiscountType === "PERCENT"
                    ? Math.max(0, Math.min(100, f.memberDiscountValue))
                    : Math.max(0, f.memberDiscountValue);
            return {
                id: f.id,
                name: f.name.trim(),
                amountBdt: Math.round(f.amountBdt * 100) / 100,
                required: f.required,
                memberDiscountType: f.memberDiscountType,
                memberDiscountValue: Math.round(clampedValue * 100) / 100,
            };
        });
        const derivedPrice =
            cleanedFees.length > 0
                ? sumRequiredFees(cleanedFees)
                : d.priceBdt !== null
                  ? Math.round(d.priceBdt * 100) / 100
                  : null;
        normalised.push({
            code,
            label,
            eventType: d.eventType,
            gender: d.gender,
            isTeam: d.isTeam,
            minAge: d.minAge,
            maxAge: d.maxAge,
            minWeightKg: d.minWeightKg,
            maxWeightKg: d.maxWeightKg,
            minRankId: d.minRankId,
            priceBdt: derivedPrice,
            fees: cleanedFees,
        });
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

function buildEventPublishedNotification(event: {
    id: string;
    title: string;
}): NotifyPayload {
    return {
        title: "New event published",
        message: `${event.title} — register now.`,
        type: "EVENT",
        link: `/events/${event.id}`,
    };
}

async function notifyMembersOfPublishedEvent(
    event: { id: string; title: string },
    tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
    const recipientIds = await findUserIdsByRoles([
        "STUDENT",
        "INSTRUCTOR",
        "DOJO_MANAGER",
        "DOJO_OWNER",
    ]);
    await notifyMembers(recipientIds, buildEventPublishedNotification(event), tx);
}

type ParsedCommon = {
    title: string;
    description: string | null;
    location: string | null;
    eventDate: Date;
    category: EventCategory;
    maxCapacity: number | null;
    memberDiscountPercent: number;
    multiDivisionDiscountType: DiscountType;
    multiDivisionDiscountPercent: number;
    eventMinAge: number | null;
    eventMinRankId: string | null;
    eventTicketPrice: number | null;
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
        const d = Number.parseFloat(discountRaw);
        if (!Number.isFinite(d) || d < 0 || d > 100) {
            return {
                ok: false,
                error: "Member discount must be a number between 0 and 100.",
            };
        }
        memberDiscountPercent = Math.round(d * 100) / 100;
    }

    const multiDivisionDiscountType = coerceDiscountType(
        formData.get("multiDivisionDiscountType"),
    );
    let multiDivisionDiscountPercent = 0;
    const multiRaw = (
        (formData.get("multiDivisionDiscountPercent") as string) ?? ""
    ).trim();
    if (multiRaw) {
        const m = Number.parseFloat(multiRaw);
        if (!Number.isFinite(m) || m < 0) {
            return {
                ok: false,
                error: "Multi-division discount must be a non-negative number.",
            };
        }
        if (multiDivisionDiscountType === "PERCENT" && m > 100) {
            return {
                ok: false,
                error: "Multi-division discount % must be between 0 and 100.",
            };
        }
        multiDivisionDiscountPercent = Math.round(m * 100) / 100;
    }

    let eventMinAge: number | null = null;
    const minAgeRaw = ((formData.get("eventMinAge") as string) ?? "").trim();
    if (minAgeRaw) {
        const a = Number.parseInt(minAgeRaw, 10);
        if (!Number.isFinite(a) || a < 1 || a > 100) {
            return {
                ok: false,
                error: "Event minimum age must be between 1 and 100.",
            };
        }
        eventMinAge = a;
    }

    const rankRaw = ((formData.get("eventMinRankId") as string) ?? "").trim();
    const eventMinRankId = rankRaw || null;

    let eventTicketPrice: number | null = null;
    const ticketRaw = ((formData.get("eventTicketPrice") as string) ?? "").trim();
    if (ticketRaw) {
        const t = Number.parseFloat(ticketRaw);
        if (!Number.isFinite(t) || t < 0) {
            return {
                ok: false,
                error: "Event ticket price must be a positive number.",
            };
        }
        eventTicketPrice = Math.round(t * 100) / 100;
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
            multiDivisionDiscountType,
            multiDivisionDiscountPercent,
            eventMinAge,
            eventMinRankId,
            eventTicketPrice,
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
        attachment = await uploadAttachmentIfPresent(
            formData.get("attachment"),
            { imagesOnly: true },
        );
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
        multiDivisionDiscountType,
        multiDivisionDiscountPercent,
        eventMinAge,
        eventMinRankId,
        eventTicketPrice,
    } = parsed.value;

    if (eventMinRankId) {
        const rank = await prisma.beltRank.findUnique({
            where: { id: eventMinRankId },
            select: { id: true },
        });
        if (!rank) {
            return { ok: false, error: "Selected event belt rank was not found." };
        }
    }

    const isPremium =
        divisions.isPremium || (eventTicketPrice !== null && eventTicketPrice > 0);

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
                isPremium,
                ticketPrice: eventTicketPrice,
                memberDiscountPercent,
                multiDivisionDiscountType,
                multiDivisionDiscountPercent,
                minAge: eventMinAge,
                minRankId: eventMinRankId,
                participantType: "PUBLIC",
                attachmentUrl: attachment?.url ?? null,
                attachmentType: attachment?.type ?? null,
                postedById: auth.userId,
                dojoId: null,
            },
        });
        if (divisions.divisions.length > 0) {
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
        }
        if (isPublished) {
            await notifyMembersOfPublishedEvent(
                { id: event.id, title: event.title },
                tx,
            );
        }
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
        select: {
            id: true,
            attachmentUrl: true,
            attachmentType: true,
            isPublished: true,
        },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    const parsed = parseCommonFields(formData);
    if (!parsed.ok) return parsed;
    const isPublished = formData.get("isPublished") !== "false";

    let attachment: { url: string; type: "IMAGE" | "PDF" } | null;
    try {
        attachment = await uploadAttachmentIfPresent(
            formData.get("attachment"),
            { imagesOnly: true },
        );
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
        multiDivisionDiscountType,
        multiDivisionDiscountPercent,
        eventMinAge,
        eventMinRankId,
        eventTicketPrice,
    } = parsed.value;

    if (eventMinRankId) {
        const rank = await prisma.beltRank.findUnique({
            where: { id: eventMinRankId },
            select: { id: true },
        });
        if (!rank) {
            return { ok: false, error: "Selected event belt rank was not found." };
        }
    }

    const isPremium =
        divisions.isPremium || (eventTicketPrice !== null && eventTicketPrice > 0);

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
                isPremium,
                ticketPrice: eventTicketPrice,
                memberDiscountPercent,
                multiDivisionDiscountType,
                multiDivisionDiscountPercent,
                minAge: eventMinAge,
                minRankId: eventMinRankId,
                participantType: "PUBLIC",
                ...(attachment
                    ? { attachmentUrl: attachment.url, attachmentType: attachment.type }
                    : {}),
            },
        });
        if (divisions.divisions.length > 0) {
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
        } else {
            // Divisions removed — drop the tournament-specific row so the
            // event registers as a plain (ticket-only) event.
            await tx.tournamentDetail.deleteMany({ where: { eventId: id } });
        }
        if (isPublished && !existing.isPublished) {
            await notifyMembersOfPublishedEvent({ id, title }, tx);
        }
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
        select: { id: true, title: true, isPublished: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

    await prisma.event.update({
        where: { id },
        data: { isPublished: next },
    });

    if (next && !existing.isPublished) {
        await notifyMembersOfPublishedEvent({
            id: existing.id,
            title: existing.title,
        });
    }

    revalidateAll();
    return { ok: true };
}
