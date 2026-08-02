"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachmentIfPresent } from "@/lib/attachment-upload";
import { loadCurrentUser } from "@/lib/auth/load-current-user";
import {
    getDivision,
    isCustomDivisionCode,
    makeCustomDivisionCode,
    parseCustomDivisions,
    type CustomDivision,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";
import type {
    EventCategory,
    EventParticipantType,
} from "@/prisma/generated/client";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const CATEGORIES = [
    "BELT_TEST",
    "TOURNAMENT",
    "SEMINAR",
    "TRAINING_CAMP",
    "OTHER",
] as const satisfies readonly EventCategory[];

const PARTICIPANT_TYPES = [
    "PUBLIC",
    "STUDENTS",
    "INSTRUCTORS",
    "PARENTS",
    "DOJO_MEMBERS",
] as const satisfies readonly EventParticipantType[];

function isCategory(v: unknown): v is EventCategory {
    return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

function isParticipantType(v: unknown): v is EventParticipantType {
    return (
        typeof v === "string" &&
        (PARTICIPANT_TYPES as readonly string[]).includes(v)
    );
}

type TournamentInput =
    | {
          eventType: TournamentEventType;
          enabledTypes: TournamentEventType[];
          enabledDivisions: string[];
          customDivisions: CustomDivision[];
          registrationDeadline: Date | null;
          weighInDate: Date | null;
          rulesUrl: string | null;
      }
    | { error: string };

// Parse the tournament fields from the event form. Only called when category
// is TOURNAMENT. An event may enable KATA, KUMITE, or both. Every enabled
// division code must be either a preset WKF code of a matching enabled type,
// or a custom division the admin defined on this same form submission.
function parseTournamentFields(formData: FormData): TournamentInput {
    const typesRaw = ((formData.get("enabledTypes") as string) ?? "").trim();
    const enabledTypes = typesRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is TournamentEventType => s === "KATA" || s === "KUMITE");
    const dedupTypes = Array.from(new Set(enabledTypes));
    if (dedupTypes.length === 0) {
        return { error: "Enable Kata, Kumite, or both for the tournament." };
    }

    // Custom divisions submitted as JSON so labels + isTeam survive intact.
    const customRaw = ((formData.get("customDivisions") as string) ?? "").trim();
    let customDivisions: CustomDivision[] = [];
    if (customRaw) {
        try {
            customDivisions = parseCustomDivisions(JSON.parse(customRaw));
        } catch {
            return { error: "Custom categories payload is malformed." };
        }
    }
    // Assign / normalise codes and reject entries whose type isn't enabled.
    const seenCodes = new Set<string>();
    const normalisedCustom: CustomDivision[] = [];
    for (const c of customDivisions) {
        if (!dedupTypes.includes(c.eventType)) {
            return {
                error: `Custom category "${c.label}" targets ${c.eventType} but that type is not enabled.`,
            };
        }
        const label = c.label.trim();
        if (!label) continue;
        const code = c.code && isCustomDivisionCode(c.code)
            ? c.code
            : makeCustomDivisionCode(label, c.eventType);
        if (seenCodes.has(code)) {
            return { error: `Duplicate custom category code: ${code}.` };
        }
        seenCodes.add(code);
        normalisedCustom.push({
            code,
            label,
            eventType: c.eventType,
            isTeam: !!c.isTeam,
        });
    }
    const customByCode = new Map(normalisedCustom.map((c) => [c.code, c]));

    const codesRaw = ((formData.get("enabledDivisions") as string) ?? "").trim();
    const codes = codesRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    if (codes.length === 0) {
        return { error: "Enable at least one division for this tournament." };
    }
    for (const c of codes) {
        if (isCustomDivisionCode(c)) {
            const cd = customByCode.get(c);
            if (!cd) return { error: `Unknown custom division code: ${c}.` };
            continue;
        }
        const d = getDivision(c);
        if (!d) return { error: `Unknown division code: ${c}.` };
        if (!dedupTypes.includes(d.eventType)) {
            return {
                error: `Division ${c} belongs to ${d.eventType} but that type is not enabled.`,
            };
        }
    }

    // Legacy single-type column: pick whichever is enabled first. The
    // application no longer branches on it, but keeping it populated avoids
    // NOT NULL trouble and preserves old reads.
    const eventType = dedupTypes[0];

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
    if (weighInRaw && dedupTypes.includes("KUMITE")) {
        const d = new Date(weighInRaw);
        if (Number.isNaN(d.getTime())) {
            return { error: "Invalid weigh-in date." };
        }
        weighInDate = d;
    }

    const rulesUrl = ((formData.get("rulesUrl") as string) ?? "").trim() || null;

    return {
        eventType,
        enabledTypes: dedupTypes,
        enabledDivisions: codes,
        customDivisions: normalisedCustom,
        registrationDeadline,
        weighInDate,
        rulesUrl,
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

    // ── Premium ticketing ───────────────────────────────────────────────
    const isPremium = formData.get("isPremium") === "true";
    let ticketPrice: number | null = null;
    let memberDiscountPercent = 0;
    if (isPremium) {
        const raw = ((formData.get("ticketPrice") as string) ?? "").trim();
        const n = Number.parseFloat(raw);
        if (!raw || !Number.isFinite(n) || n <= 0) {
            return {
                ok: false,
                error: "Premium events need a ticket price greater than zero.",
            };
        }
        ticketPrice = Math.round(n * 100) / 100;

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
    }

    // ── Optional participation gates ────────────────────────────────────
    const participantTypeRaw = formData.get("participantType") ?? "PUBLIC";
    if (!isParticipantType(participantTypeRaw)) {
        return { ok: false, error: "Invalid participant type." };
    }

    let minAge: number | null = null;
    const minAgeRaw = ((formData.get("minAge") as string) ?? "").trim();
    if (minAgeRaw) {
        const n = Number.parseInt(minAgeRaw, 10);
        if (!Number.isFinite(n) || n < 1 || n > 100) {
            return { ok: false, error: "Minimum age must be between 1 and 100." };
        }
        minAge = n;
    }

    let minRankId: string | null = null;
    const minRankRaw = ((formData.get("minRankId") as string) ?? "").trim();
    if (minRankRaw) {
        const rank = await prisma.beltRank.findUnique({
            where: { id: minRankRaw },
            select: { id: true },
        });
        if (!rank) return { ok: false, error: "Unknown belt rank." };
        minRankId = rank.id;
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

    let tournament: TournamentInput | null = null;
    if (categoryRaw === "TOURNAMENT") {
        const parsed = parseTournamentFields(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error };
        tournament = parsed;
    }

    const created = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                title,
                description,
                location,
                eventDate,
                category: categoryRaw,
                maxCapacity,
                isPublished,
                isPremium,
                ticketPrice,
                memberDiscountPercent,
                minAge,
                minRankId,
                participantType: participantTypeRaw,
                attachmentUrl: attachment?.url ?? null,
                attachmentType: attachment?.type ?? null,
                postedById: auth.userId,
                dojoId: null,
            },
        });
        if (tournament && !("error" in tournament)) {
            await tx.tournamentDetail.create({
                data: {
                    eventId: event.id,
                    eventType: tournament.eventType,
                    enabledTypes: tournament.enabledTypes,
                    enabledDivisions: tournament.enabledDivisions,
                    customDivisions: tournament.customDivisions,
                    registrationDeadline: tournament.registrationDeadline,
                    weighInDate: tournament.weighInDate,
                    rulesUrl: tournament.rulesUrl,
                },
            });
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
        select: { id: true, attachmentUrl: true, attachmentType: true },
    });
    if (!existing) return { ok: false, error: "Event not found." };

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

    const isPremium = formData.get("isPremium") === "true";
    let ticketPrice: number | null = null;
    let memberDiscountPercent = 0;
    if (isPremium) {
        const raw = ((formData.get("ticketPrice") as string) ?? "").trim();
        const n = Number.parseFloat(raw);
        if (!raw || !Number.isFinite(n) || n <= 0) {
            return {
                ok: false,
                error: "Premium events need a ticket price greater than zero.",
            };
        }
        ticketPrice = Math.round(n * 100) / 100;

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
    }

    const participantTypeRaw = formData.get("participantType") ?? "PUBLIC";
    if (!isParticipantType(participantTypeRaw)) {
        return { ok: false, error: "Invalid participant type." };
    }

    let minAge: number | null = null;
    const minAgeRaw = ((formData.get("minAge") as string) ?? "").trim();
    if (minAgeRaw) {
        const n = Number.parseInt(minAgeRaw, 10);
        if (!Number.isFinite(n) || n < 1 || n > 100) {
            return { ok: false, error: "Minimum age must be between 1 and 100." };
        }
        minAge = n;
    }

    let minRankId: string | null = null;
    const minRankRaw = ((formData.get("minRankId") as string) ?? "").trim();
    if (minRankRaw) {
        const rank = await prisma.beltRank.findUnique({
            where: { id: minRankRaw },
            select: { id: true },
        });
        if (!rank) return { ok: false, error: "Unknown belt rank." };
        minRankId = rank.id;
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

    let tournament: TournamentInput | null = null;
    if (categoryRaw === "TOURNAMENT") {
        const parsed = parseTournamentFields(formData);
        if ("error" in parsed) return { ok: false, error: parsed.error };
        tournament = parsed;
    }

    await prisma.$transaction(async (tx) => {
        await tx.event.update({
            where: { id },
            data: {
                title,
                description,
                location,
                eventDate,
                category: categoryRaw,
                maxCapacity,
                isPublished,
                isPremium,
                ticketPrice,
                memberDiscountPercent,
                minAge,
                minRankId,
                participantType: participantTypeRaw,
                ...(attachment
                    ? { attachmentUrl: attachment.url, attachmentType: attachment.type }
                    : {}),
            },
        });
        // Upsert on category change: TOURNAMENT-only detail row appears or
        // disappears with the category selection.
        if (tournament && !("error" in tournament)) {
            await tx.tournamentDetail.upsert({
                where: { eventId: id },
                update: {
                    eventType: tournament.eventType,
                    enabledTypes: tournament.enabledTypes,
                    enabledDivisions: tournament.enabledDivisions,
                    customDivisions: tournament.customDivisions,
                    registrationDeadline: tournament.registrationDeadline,
                    weighInDate: tournament.weighInDate,
                    rulesUrl: tournament.rulesUrl,
                },
                create: {
                    eventId: id,
                    eventType: tournament.eventType,
                    enabledTypes: tournament.enabledTypes,
                    enabledDivisions: tournament.enabledDivisions,
                    customDivisions: tournament.customDivisions,
                    registrationDeadline: tournament.registrationDeadline,
                    weighInDate: tournament.weighInDate,
                    rulesUrl: tournament.rulesUrl,
                },
            });
        } else {
            await tx.tournamentDetail.deleteMany({ where: { eventId: id } });
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
