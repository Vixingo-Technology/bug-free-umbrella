"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sendEventRegistrationEmail } from "@/lib/email/send-event-registration";
import { initiateTicketPayment } from "@/lib/events/ticket-payment";
import { computeGroupPayable } from "@/lib/events/pricing";
import { isJkaMember } from "@/lib/auth/is-jka-member";
import {
    applyTypedDiscount,
    coerceDiscountType,
} from "@/lib/pricing/discount";
import { uploadImageIfPresent } from "@/lib/attachment-upload";
import {
    ageOnDate,
    feeAmountAfterMemberDiscount,
    parseCustomDivisions,
    resolveDivision,
    type CustomDivision,
} from "@/lib/tournaments/divisions";
import type { Gender } from "@/prisma/generated/client";

type ActionResult =
    | { ok: true; token: string; payUrl?: string }
    | { ok: false; error: string };

type CheckInResult =
    | {
          ok: true;
          alreadyCheckedIn: boolean;
          checkedInAt: Date;
          participantName: string;
          eventTitle: string;
          eventId: string;
      }
    | { ok: false; error: string };

function urlSafeToken(bytes = 18): string {
    return randomBytes(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function normaliseEmail(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
}

function trim(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value.trim() : "";
}

function isGender(v: string): v is Gender {
    return v === "MALE" || v === "FEMALE";
}

/**
 * Resume payment for a PENDING premium registration, from the participation
 * card page.
 */
export async function payForRegistrationAction(formData: FormData): Promise<void> {
    const token = ((formData.get("token") as string) ?? "").trim();
    if (!token) redirect("/");

    const reg = await prisma.eventRegistration.findUnique({
        where: { qrToken: token },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    ticketPrice: true,
                    multiDivisionDiscountType: true,
                    multiDivisionDiscountPercent: true,
                    tournamentDetail: { select: { customDivisions: true } },
                },
            },
            user: {
                select: {
                    fullName: true,
                    email: true,
                    contactEmail: true,
                    phone: true,
                },
            },
        },
    });
    if (!reg) redirect("/");
    if (reg.paymentStatus !== "PENDING") {
        redirect(`/participants/${encodeURIComponent(token)}`);
    }

    // Prefer the account's real contactEmail; skip the synthetic
    // {uuid}@members.jkabangladesh.com auth email so we never send it upstream.
    const authEmail = reg.user?.email ?? null;
    const realAuthEmail =
        authEmail && !authEmail.endsWith("@members.jkabangladesh.com")
            ? authEmail
            : null;
    const buyerEmail =
        reg.user?.contactEmail ?? realAuthEmail ?? reg.guestEmail ?? "";

    const groupTotal = await groupTotalFor(reg);
    const init = await initiateTicketPayment({
        registrationId: reg.id,
        qrToken: reg.qrToken,
        amount: groupTotal.amount,
        eventId: reg.event.id,
        eventTitle:
            groupTotal.count > 1
                ? `${reg.event.title} — ${groupTotal.count} divisions`
                : reg.event.title,
        customerName: reg.user?.fullName ?? reg.guestName ?? "Participant",
        customerEmail: buyerEmail,
        customerPhone: reg.user?.phone ?? reg.guestPhone ?? null,
    });
    if (init.kind === "gateway") redirect(init.url);
    if (init.kind === "devPaid") {
        redirect(`/participants/${encodeURIComponent(token)}?paid=1`);
    }
    redirect(
        `/participants/${encodeURIComponent(token)}?error=${encodeURIComponent(
            init.kind === "error" ? init.message : "Payment failed.",
        )}`,
    );
}

/**
 * Mark a participant present. ADMIN, DOJO_OWNER, and DOJO_MANAGER may call
 * this — the latter two only for events at their own dojo (or events they
 * posted personally).
 */
export async function checkInParticipantAction(
    token: string,
): Promise<CheckInResult> {
    if (!token) return { ok: false, error: "Missing check-in token." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in as an authority to check in participants." };

    const { loadCurrentUser } = await import("@/lib/auth/load-current-user");
    const me = await loadCurrentUser(user.id);
    if (!me) return { ok: false, error: "Account not found." };
    if (
        me.role !== "ADMIN" &&
        me.role !== "DOJO_OWNER" &&
        me.role !== "DOJO_MANAGER"
    ) {
        return {
            ok: false,
            error: "Only admins, dojo owners, and managers can check in.",
        };
    }

    const registration = await prisma.eventRegistration.findUnique({
        where: { qrToken: token },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    dojoId: true,
                    postedById: true,
                },
            },
            user: { select: { fullName: true } },
        },
    });
    if (!registration) {
        return { ok: false, error: "Invalid or unknown check-in code." };
    }

    if (
        registration.paymentStatus === "PENDING" ||
        registration.paymentStatus === "FAILED"
    ) {
        return {
            ok: false,
            error: "This ticket has not been paid yet. Ask the participant to complete payment first.",
        };
    }

    if (me.role === "DOJO_OWNER" || me.role === "DOJO_MANAGER") {
        const eventDojoId = registration.event.dojoId;
        const eventPostedById = registration.event.postedById;
        const isAllowed =
            (eventDojoId && eventDojoId === me.dojoId) ||
            eventPostedById === user.id;
        if (!isAllowed) {
            return { ok: false, error: "This event is not at your dojo." };
        }
    }

    const participantName =
        registration.user?.fullName ?? registration.guestName ?? "Participant";

    if (registration.checkedInAt) {
        return {
            ok: true,
            alreadyCheckedIn: true,
            checkedInAt: registration.checkedInAt,
            participantName,
            eventTitle: registration.event.title,
            eventId: registration.event.id,
        };
    }

    const checkedInAt = new Date();
    await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { checkedInAt, checkedInByUserId: user.id },
    });

    revalidatePath(`/portal/admin/events/${registration.event.id}/participants`);
    revalidatePath(`/participants/${token}`);

    return {
        ok: true,
        alreadyCheckedIn: false,
        checkedInAt,
        participantName,
        eventTitle: registration.event.title,
        eventId: registration.event.id,
    };
}

async function groupTotalFor(reg: {
    id: string;
    userId: string | null;
    paymentGroupId: string | null;
    divisionCode: string | null;
    selectedOptionalFees: unknown;
    amountDue: import("@/prisma/generated/client").Prisma.Decimal | null;
    event: {
        ticketPrice: import("@/prisma/generated/client").Prisma.Decimal | null;
        multiDivisionDiscountType: string;
        multiDivisionDiscountPercent: import("@/prisma/generated/client").Prisma.Decimal;
        tournamentDetail: { customDivisions: unknown } | null;
    };
}): Promise<{ amount: number; count: number }> {
    const eventCtx = {
        ticketPrice: reg.event.ticketPrice ? Number(reg.event.ticketPrice) : null,
        multiDivisionDiscountType: coerceDiscountType(reg.event.multiDivisionDiscountType),
        multiDivisionDiscountPercent: Number(reg.event.multiDivisionDiscountPercent),
        customDivisions: reg.event.tournamentDetail?.customDivisions,
    };
    const isMember = reg.userId ? await isJkaMember(reg.userId) : false;

    if (!reg.paymentGroupId) {
        return {
            amount: computeGroupPayable(
                [
                    {
                        divisionCode: reg.divisionCode,
                        selectedOptionalFees: reg.selectedOptionalFees,
                    },
                ],
                eventCtx,
                isMember,
            ),
            count: 1,
        };
    }
    const siblings = await prisma.eventRegistration.findMany({
        where: { paymentGroupId: reg.paymentGroupId },
        select: {
            divisionCode: true,
            selectedOptionalFees: true,
        },
    });
    const rows = siblings.length
        ? siblings
        : [
              {
                  divisionCode: reg.divisionCode,
                  selectedOptionalFees: reg.selectedOptionalFees,
              },
          ];
    return {
        amount: computeGroupPayable(rows, eventCtx, isMember),
        count: rows.length,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// EVENT REGISTRATION — divisions with per-division pricing
// ─────────────────────────────────────────────────────────────────────────

export async function registerForTournamentAction(
    formData: FormData,
): Promise<ActionResult> {
    const eventId = trim(formData.get("eventId"));
    if (!eventId) return { ok: false, error: "Missing event id." };

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            isPublished: true,
            maxCapacity: true,
            eventDate: true,
            location: true,
            dojoId: true,
            // Event-wide base ticket, added on top of the selected division
            // fees. Null / 0 = no base ticket.
            ticketPrice: true,
            // Optional discount applied when the participant picks 2+
            // divisions. `Type` decides whether the value is a % or a
            // flat BDT amount. Applied to the summed division fees only,
            // not to the base ticket.
            multiDivisionDiscountType: true,
            multiDivisionDiscountPercent: true,
            dojo: { select: { name: true } },
            tournamentDetail: true,
        },
    });
    if (!event || !event.isPublished) {
        return { ok: false, error: "Event not found." };
    }
    if (
        event.tournamentDetail?.registrationDeadline &&
        event.tournamentDetail.registrationDeadline.getTime() < Date.now()
    ) {
        return { ok: false, error: "Registration for this event has closed." };
    }
    if (event.maxCapacity !== null) {
        // Distinct people, not division-entries — matches the number shown
        // on public listings so the gate can't disagree with the badge.
        const { countUniqueParticipants } = await import(
            "@/lib/events/participant-count"
        );
        const currentRsvps = await countUniqueParticipants(eventId);
        if (currentRsvps >= event.maxCapacity) {
            return { ok: false, error: "This event is fully booked." };
        }
    }

    const customDivisions = event.tournamentDetail
        ? parseCustomDivisions(event.tournamentDetail.customDivisions)
        : [];

    // Divisions the participant selected — form posts one hidden input per
    // pick under the name `divisionCode`.
    const picked = formData
        .getAll("divisionCode")
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
    const codesToRegister = Array.from(new Set(picked));

    const divisions: Array<{ code: string; division: CustomDivision }> = [];
    for (const code of codesToRegister) {
        const d = resolveDivision(code, customDivisions);
        if (!d) return { ok: false, error: `Unknown division: ${code}.` };
        divisions.push({ code, division: d });
    }

    // Events with divisions must have at least one picked — the form disables
    // submit when nothing is selected, but re-check server-side too.
    if (customDivisions.length > 0 && divisions.length === 0) {
        return { ok: false, error: "Pick at least one division to register." };
    }

    const genderRaw = trim(formData.get("entrantGender"));
    if (!isGender(genderRaw)) return { ok: false, error: "Select your gender." };

    const dobStr = trim(formData.get("dateOfBirth"));
    const dob = dobStr ? new Date(dobStr) : null;
    if (!dob || Number.isNaN(dob.getTime())) {
        return { ok: false, error: "Enter a valid date of birth." };
    }

    const anyKumite = divisions.some(
        ({ division }) => division.eventType === "KUMITE",
    );
    let weightKg: number | null = null;
    if (anyKumite) {
        const w = Number.parseFloat(trim(formData.get("entrantWeightKg")));
        if (!Number.isFinite(w) || w <= 0) {
            return { ok: false, error: "Enter your weight in kg." };
        }
        weightKg = Math.round(w * 100) / 100;
    }

    const entrantAge = ageOnDate(dob, event.eventDate);

    const entrantBeltRank = trim(formData.get("entrantBeltRank")) || null;
    const anyRankGated = divisions.some(({ division }) => !!division.minRankId);
    if (anyRankGated && !entrantBeltRank) {
        return { ok: false, error: "Belt rank is required for the selected division." };
    }

    // Look up ranks the selected divisions gate on, plus the rank the
    // entrant declared on the form, so we can enforce minRankId server-side.
    const requiredRankIds = Array.from(
        new Set(
            divisions
                .map(({ division }) => division.minRankId)
                .filter((x): x is string => !!x),
        ),
    );
    const rankRows = requiredRankIds.length
        ? await prisma.beltRank.findMany({
              where: { id: { in: requiredRankIds } },
              select: { id: true, name: true, orderIndex: true },
          })
        : [];
    const rankById = new Map(rankRows.map((r) => [r.id, r]));

    // ── Common (member vs guest) ────────────────────────────────────────
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Trust the belt rank the entrant declared on the form (guest or
    // member) — the form message reminds them to bring proof on the day.
    // If the entrant is a signed-in student and their declared rank matches
    // a known belt, we cross-check with their student record.
    const declaredRank = entrantBeltRank
        ? await prisma.beltRank.findUnique({
              where: { name: entrantBeltRank },
              select: { orderIndex: true },
          })
        : null;
    let viewerRankOrder: number | null = declaredRank?.orderIndex ?? null;
    if (user && viewerRankOrder === null) {
        const s = await prisma.student.findUnique({
            where: { id: user.id },
            select: { currentRank: true },
        });
        if (s) {
            const rank = await prisma.beltRank.findUnique({
                where: { name: s.currentRank },
                select: { orderIndex: true },
            });
            viewerRankOrder = rank?.orderIndex ?? null;
        }
    }

    for (const { division } of divisions) {
        if (division.gender !== "ANY" && division.gender !== genderRaw) {
            return {
                ok: false,
                error: `${division.label} is restricted to ${
                    division.gender === "MALE" ? "male" : "female"
                } participants.`,
            };
        }
        if (division.minAge !== null && entrantAge < division.minAge) {
            return {
                ok: false,
                error: `${division.label} requires minimum age ${division.minAge} on the event date.`,
            };
        }
        if (division.minRankId) {
            const required = rankById.get(division.minRankId);
            if (required) {
                if (viewerRankOrder === null || viewerRankOrder < required.orderIndex) {
                    return {
                        ok: false,
                        error: `${division.label} requires at least ${required.name}.`,
                    };
                }
            }
        }
    }

    const registrantIsMember = user ? await isJkaMember(user.id) : false;

    // Parse opt-in fees the participant picked. The form posts one hidden
    // input per pick under `optionalFee` with value `${divisionCode}:${feeId}`.
    const chosenOptional = new Set<string>();
    for (const v of formData.getAll("optionalFee")) {
        if (typeof v === "string" && v.includes(":")) chosenOptional.add(v);
    }

    // Divisions that expose opt-in fees require the participant to pick at
    // least one — the form disables submit when a division is missing its
    // add-on, but re-check here so a hand-crafted POST can't bypass it.
    for (const { code, division } of divisions) {
        const optional = division.fees?.filter((f) => !f.required) ?? [];
        if (optional.length === 0) continue;
        const anyPicked = optional.some((f) =>
            chosenOptional.has(`${code}:${f.id}`),
        );
        if (!anyPicked) {
            return {
                ok: false,
                error: `Pick at least one add-on for ${division.label}.`,
            };
        }
    }

    // Compute per-division prices (required fees + chosen optional fees).
    // The per-fee member discount is applied to each fee for JKA members;
    // when 2+ divisions are selected, the event's multi-division discount
    // is applied ONCE to the summed subtotal and pro-rated back across
    // rows so per-row `amountDue` still adds up.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const preDiscountPerCode = new Map<string, number>();
    // Snapshot of picked opt-in fees per division, saved on the row so the
    // participation card can show what the entrant chose.
    const optionalSnapshotPerCode = new Map<
        string,
        { id: string; name: string; amountBdt: number }[]
    >();
    let preDiscountSubtotal = 0;
    for (const { code, division } of divisions) {
        let effective = 0;
        const picked: { id: string; name: string; amountBdt: number }[] = [];
        if (division.fees && division.fees.length > 0) {
            for (const f of division.fees) {
                const isActive =
                    f.required || chosenOptional.has(`${code}:${f.id}`);
                if (isActive) {
                    effective += feeAmountAfterMemberDiscount(
                        f,
                        registrantIsMember,
                    );
                }
                if (!f.required && chosenOptional.has(`${code}:${f.id}`)) {
                    picked.push({
                        id: f.id,
                        name: f.name,
                        amountBdt: feeAmountAfterMemberDiscount(
                            f,
                            registrantIsMember,
                        ),
                    });
                }
            }
        } else {
            effective = division.priceBdt ?? 0;
        }
        optionalSnapshotPerCode.set(code, picked);
        effective = round2(effective);
        preDiscountPerCode.set(code, effective);
        preDiscountSubtotal += effective;
    }
    preDiscountSubtotal = round2(preDiscountSubtotal);

    const multiDivisionType = coerceDiscountType(event.multiDivisionDiscountType);
    const multiDivisionValue = Number(event.multiDivisionDiscountPercent);
    let divisionsSubtotal = preDiscountSubtotal;
    const pricePerCode = new Map<string, number>();
    if (
        divisions.length >= 2 &&
        preDiscountSubtotal > 0 &&
        multiDivisionValue > 0
    ) {
        divisionsSubtotal = applyTypedDiscount(
            preDiscountSubtotal,
            multiDivisionType,
            multiDivisionValue,
        );
        // Pro-rate the discounted total across rows; put any rounding
        // remainder on the last non-zero row so the sum matches exactly.
        const ratio = divisionsSubtotal / preDiscountSubtotal;
        let allocated = 0;
        const codes = Array.from(preDiscountPerCode.keys());
        codes.forEach((code, idx) => {
            const orig = preDiscountPerCode.get(code) ?? 0;
            const isLast = idx === codes.length - 1;
            const scaled = isLast
                ? round2(divisionsSubtotal - allocated)
                : round2(orig * ratio);
            pricePerCode.set(code, Math.max(0, scaled));
            allocated = round2(allocated + scaled);
        });
    } else {
        for (const [code, price] of preDiscountPerCode) {
            pricePerCode.set(code, price);
        }
    }
    divisionsSubtotal = round2(divisionsSubtotal);

    // Optional event-wide base ticket (paid once per registration group).
    // Applies neither the per-fee discount nor the multi-division discount —
    // it's a flat charge separate from division fees.
    let ticketAmount = 0;
    if (event.ticketPrice !== null && Number(event.ticketPrice) > 0) {
        ticketAmount = round2(Number(event.ticketPrice));
        // Attach the ticket to the first division row so per-row accounting
        // stays coherent (payment webhook fans PAID across sibling rows).
        const firstCode = divisions[0]?.code;
        if (firstCode) {
            const prev = pricePerCode.get(firstCode) ?? 0;
            pricePerCode.set(firstCode, round2(prev + ticketAmount));
        }
    }

    let totalAmount = round2(divisionsSubtotal + ticketAmount);
    const isPremium = totalAmount > 0;
    const paymentGroupId =
        isPremium && divisions.length > 1 ? randomUUID() : null;

    const userId = user?.id ?? null;
    let guestName: string | null = null;
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;

    if (!userId) {
        guestName = trim(formData.get("name")) || null;
        guestEmail = normaliseEmail(formData.get("email") as string);
        guestPhone = trim(formData.get("phone")) || null;
        if (!guestName) return { ok: false, error: "Your name is required." };
        if (!guestEmail) return { ok: false, error: "Your email is required." };
        if (!guestPhone) return { ok: false, error: "Your phone is required." };
    }

    // Buyer identity for SSLCommerz — prefer the account's real contact
    // details, skipping the synthetic {uuid}@members.jkabangladesh.com auth
    // email so it never leaves our system.
    const account = userId
        ? await prisma.user.findUnique({
              where: { id: userId },
              select: {
                  fullName: true,
                  email: true,
                  contactEmail: true,
                  phone: true,
              },
          })
        : null;
    const realAuthEmail =
        account?.email && !account.email.endsWith("@members.jkabangladesh.com")
            ? account.email
            : null;
    const buyerName = account?.fullName ?? guestName ?? "Participant";
    const buyerEmail =
        account?.contactEmail ?? realAuthEmail ?? guestEmail ?? "";
    const buyerPhone = account?.phone ?? guestPhone;

    const entrantDojoName = trim(formData.get("entrantDojoName")) || null;
    const coachName = trim(formData.get("coachName")) || null;
    const emergencyContactName = trim(formData.get("emergencyContactName")) || null;
    const emergencyContactPhone = trim(formData.get("emergencyContactPhone")) || null;
    if (!emergencyContactName || !emergencyContactPhone) {
        return { ok: false, error: "Emergency contact details are required." };
    }

    const anyTeam = divisions.some(({ division }) => division.isTeam);
    let teamName: string | null = null;
    let teammates: unknown = null;
    if (anyTeam) {
        teamName = trim(formData.get("teamName")) || null;
        const t1n = trim(formData.get("teammate1Name"));
        const t2n = trim(formData.get("teammate2Name"));
        if (!teamName || !t1n || !t2n) {
            return {
                ok: false,
                error: "Team name and both teammates are required for team divisions.",
            };
        }
        teammates = [
            { name: t1n, memberNumber: trim(formData.get("teammate1Member")) || null },
            { name: t2n, memberNumber: trim(formData.get("teammate2Member")) || null },
        ];
    }

    const isMinor = entrantAge < 18;
    let guardianName: string | null = null;
    let guardianPhone: string | null = null;
    let guardianConsent: boolean | null = null;
    if (isMinor) {
        guardianName = trim(formData.get("guardianName")) || null;
        guardianPhone = trim(formData.get("guardianPhone")) || null;
        guardianConsent = trim(formData.get("guardianConsent")) === "true";
        if (!guardianName || !guardianPhone || !guardianConsent) {
            return {
                ok: false,
                error: "Guardian name, phone, and consent are required for participants under 18.",
            };
        }
    }

    let profileImageUrl: string | null = null;
    try {
        profileImageUrl = await uploadImageIfPresent(formData.get("profileImage"));
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Profile image upload failed.",
        };
    }
    // No new upload → fall back to the account's own avatar so the
    // participation card still carries the member's photo.
    if (!profileImageUrl) {
        const existing = trim(formData.get("existingProfileImageUrl"));
        if (existing && /^https?:\/\//i.test(existing)) {
            profileImageUrl = existing;
        } else if (userId) {
            const u = await prisma.user.findUnique({
                where: { id: userId },
                select: { avatarUrl: true },
            });
            profileImageUrl = u?.avatarUrl ?? null;
        }
    }

    type CreatedRow = { id: string; qrToken: string; divisionCode: string };
    const created: CreatedRow[] = [];
    let existingFallback: CreatedRow | null = null;
    let pendingExisting: {
        id: string;
        qrToken: string;
    } | null = null;

    for (const { code, division } of divisions) {
        const existing = userId
            ? await prisma.eventRegistration.findFirst({
                  where: { eventId, userId, divisionCode: code },
                  select: {
                      id: true,
                      qrToken: true,
                      paymentStatus: true,
                  },
              })
            : guestEmail
              ? await prisma.eventRegistration.findFirst({
                    where: {
                        eventId,
                        userId: null,
                        divisionCode: code,
                        guestEmail: { equals: guestEmail, mode: "insensitive" },
                    },
                    select: {
                        id: true,
                        qrToken: true,
                        paymentStatus: true,
                    },
                })
              : null;

        if (existing) {
            if (existing.paymentStatus === "PENDING") {
                pendingExisting = {
                    id: existing.id,
                    qrToken: existing.qrToken,
                };
                continue;
            }
            existingFallback = existingFallback ?? {
                id: existing.id,
                qrToken: existing.qrToken,
                divisionCode: code,
            };
            continue;
        }

        const perRowPrice = pricePerCode.get(code) ?? 0;
        const qrToken = urlSafeToken();
        const reg = await prisma.eventRegistration.create({
            data: {
                eventId,
                userId,
                guestName,
                guestEmail,
                guestPhone,
                qrToken,
                paymentStatus: isPremium && perRowPrice > 0 ? "PENDING" : isPremium ? "PAID" : null,
                amountDue: isPremium ? perRowPrice : null,
                paidAt: isPremium && perRowPrice === 0 ? new Date() : null,
                paymentGroupId,
                divisionCode: code,
                entrantGender: genderRaw,
                entrantWeightKg:
                    division.eventType === "KUMITE" ? weightKg : null,
                entrantBeltRank,
                entrantDojoName,
                coachName,
                teamName: division.isTeam ? teamName : null,
                teammates: (division.isTeam ? teammates : null) as never,
                guardianName,
                guardianPhone,
                guardianConsent,
                emergencyContactName,
                emergencyContactPhone,
                profileImageUrl,
                guestDateOfBirth: dob,
                selectedOptionalFees:
                    (optionalSnapshotPerCode.get(code) ?? []).length > 0
                        ? (optionalSnapshotPerCode.get(code) as never)
                        : undefined,
            },
            select: { id: true, qrToken: true },
        });
        created.push({
            id: reg.id,
            qrToken: reg.qrToken,
            divisionCode: code,
        });
    }

    // Ticket-only path: event has no divisions. Insert a single row without
    // a divisionCode. All the same fields (guardian, emergency contact,
    // profile image) apply.
    if (divisions.length === 0) {
        const existing = userId
            ? await prisma.eventRegistration.findFirst({
                  where: { eventId, userId, divisionCode: null },
                  select: {
                      id: true,
                      qrToken: true,
                      paymentStatus: true,
                  },
              })
            : guestEmail
              ? await prisma.eventRegistration.findFirst({
                    where: {
                        eventId,
                        userId: null,
                        divisionCode: null,
                        guestEmail: { equals: guestEmail, mode: "insensitive" },
                    },
                    select: {
                        id: true,
                        qrToken: true,
                        paymentStatus: true,
                    },
                })
              : null;

        if (existing) {
            if (existing.paymentStatus === "PENDING") {
                pendingExisting = {
                    id: existing.id,
                    qrToken: existing.qrToken,
                };
            } else {
                existingFallback = {
                    id: existing.id,
                    qrToken: existing.qrToken,
                    divisionCode: "",
                };
            }
        } else {
            const qrToken = urlSafeToken();
            const reg = await prisma.eventRegistration.create({
                data: {
                    eventId,
                    userId,
                    guestName,
                    guestEmail,
                    guestPhone,
                    qrToken,
                    paymentStatus:
                        isPremium && ticketAmount > 0
                            ? "PENDING"
                            : isPremium
                              ? "PAID"
                              : null,
                    amountDue: isPremium ? ticketAmount : null,
                    paidAt:
                        isPremium && ticketAmount === 0 ? new Date() : null,
                    paymentGroupId: null,
                    divisionCode: null,
                    entrantGender: genderRaw,
                    entrantWeightKg: null,
                    entrantBeltRank,
                    entrantDojoName,
                    coachName,
                    teamName: null,
                    teammates: null as never,
                    guardianName,
                    guardianPhone,
                    guardianConsent,
                    emergencyContactName,
                    emergencyContactPhone,
                    profileImageUrl,
                    guestDateOfBirth: dob,
                },
                select: { id: true, qrToken: true },
            });
            created.push({
                id: reg.id,
                qrToken: reg.qrToken,
                divisionCode: "",
            });
        }
    }

    if (pendingExisting) {
        const full = await prisma.eventRegistration.findUnique({
            where: { id: pendingExisting.id },
            select: {
                id: true,
                userId: true,
                paymentGroupId: true,
                divisionCode: true,
                selectedOptionalFees: true,
                amountDue: true,
                event: {
                    select: {
                        ticketPrice: true,
                        multiDivisionDiscountType: true,
                        multiDivisionDiscountPercent: true,
                        tournamentDetail: { select: { customDivisions: true } },
                    },
                },
            },
        });
        const groupTotal = full
            ? await groupTotalFor(full)
            : { amount: totalAmount, count: divisions.length };
        const init = await initiateTicketPayment({
            registrationId: pendingExisting.id,
            qrToken: pendingExisting.qrToken,
            amount: groupTotal.amount,
            eventId: event.id,
            eventTitle:
                groupTotal.count > 1
                    ? `${event.title} — ${groupTotal.count} divisions`
                    : event.title,
            customerName: buyerName,
            customerEmail: buyerEmail,
            customerPhone: buyerPhone,
        });
        if (init.kind === "gateway") {
            return { ok: true, token: pendingExisting.qrToken, payUrl: init.url };
        }
        if (init.kind === "devPaid") {
            return { ok: true, token: pendingExisting.qrToken };
        }
        return { ok: false, error: init.message };
    }

    if (created.length === 0) {
        if (existingFallback) return { ok: true, token: existingFallback.qrToken };
        return {
            ok: false,
            error:
                divisions.length === 0
                    ? "You're already registered for this event."
                    : "You're already registered for that division.",
        };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/portal/admin/events/${eventId}/participants`);

    if (isPremium && totalAmount > 0) {
        // The first paid row drives the gateway session. Zero-price rows
        // (mixed free/paid selection) are already flagged PAID on insert.
        const primary = created.find((row) => {
            const p = pricePerCode.get(row.divisionCode) ?? 0;
            return p > 0;
        }) ?? created[0];
        const init = await initiateTicketPayment({
            registrationId: primary.id,
            qrToken: primary.qrToken,
            amount: totalAmount,
            eventId: event.id,
            eventTitle:
                created.length > 1
                    ? `${event.title} — ${created.length} divisions`
                    : event.title,
            customerName: buyerName,
            customerEmail: buyerEmail,
            customerPhone: buyerPhone,
        });
        if (init.kind === "gateway") {
            return { ok: true, token: primary.qrToken, payUrl: init.url };
        }
        if (init.kind === "devPaid") {
            return { ok: true, token: primary.qrToken };
        }
        return { ok: false, error: init.message };
    }

    // Free event — participation card + email fires now.
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000";
    // Free events fire one email per registered row. If the member's account
    // has a name/email we prefer those, falling back to the guest form values.
    let memberName: string | null = null;
    let memberContactEmail: string | null = null;
    let memberAuthEmail: string | null = null;
    if (user) {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true, contactEmail: true, email: true },
        });
        memberName = u?.fullName ?? null;
        memberContactEmail = u?.contactEmail ?? null;
        memberAuthEmail = u?.email ?? null;
    }
    const realMemberAuthEmail =
        memberAuthEmail &&
        !memberAuthEmail.endsWith("@members.jkabangladesh.com")
            ? memberAuthEmail
            : null;
    const recipientEmail =
        memberContactEmail ?? guestEmail ?? realMemberAuthEmail;
    const participantName = memberName ?? guestName ?? "Participant";
    for (const row of created) {
        await sendEventRegistrationEmail(recipientEmail, {
            participantName,
            participationCardUrl: `${appUrl}/participants/${row.qrToken}`,
            invoiceUrl: null,
            isPaid: false,
            amountPaidBdt: null,
            event: {
                title: event.title,
                eventDate: event.eventDate.toISOString(),
                location: event.location,
                dojoName: event.dojo?.name ?? null,
            },
        });
    }
    return { ok: true, token: created[0].qrToken };
}

export async function registerForTournamentAndRedirect(
    formData: FormData,
): Promise<void> {
    const res = await registerForTournamentAction(formData);
    if (!res.ok) {
        const eventId = (formData.get("eventId") as string) ?? "";
        redirect(
            `/events/${eventId}/register?error=${encodeURIComponent(res.error)}`,
        );
    }
    if (res.payUrl) redirect(res.payUrl);
    redirect(`/participants/${res.token}`);
}

/**
 * Form-action wrapper around checkInParticipantAction.
 */
export async function checkInFromCardAction(formData: FormData): Promise<void> {
    const token = ((formData.get("token") as string) ?? "").trim();
    if (!token) redirect("/");

    const result = await checkInParticipantAction(token);
    revalidatePath(`/participants/${token}`);

    if (!result.ok) {
        redirect(
            `/participants/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`,
        );
    }
    redirect(
        `/participants/${encodeURIComponent(token)}?checked=${
            result.alreadyCheckedIn ? "already" : "1"
        }`,
    );
}
