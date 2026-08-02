"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { emitEventRegistered } from "@/lib/n8n";
import {
    ageAt,
    checkEligibility,
    loadViewerContext,
    type EventGates,
} from "@/lib/events/eligibility";
import { initiateTicketPayment } from "@/lib/events/ticket-payment";
import { applyDiscount, isJkaMember } from "@/lib/auth/is-jka-member";
import {
    ageOnDate,
    checkDivisionEligibility,
    parseCustomDivisions,
    resolveDivision,
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
    // 18 bytes → 24 base64url chars. Plenty of entropy and easy to scan.
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

export async function registerForEventAction(
    formData: FormData,
): Promise<ActionResult> {
    const eventId = (formData.get("eventId") as string)?.trim();
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
            isPremium: true,
            ticketPrice: true,
            memberDiscountPercent: true,
            minAge: true,
            participantType: true,
            minRank: { select: { id: true, name: true, orderIndex: true } },
            dojo: { select: { name: true } },
            _count: { select: { registrations: true } },
        },
    });
    if (!event || !event.isPublished) {
        return { ok: false, error: "Event not found." };
    }
    if (
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity
    ) {
        return { ok: false, error: "This event is fully booked." };
    }

    const baseTicketPrice = event.ticketPrice ? Number(event.ticketPrice) : null;
    const isPremium = event.isPremium && baseTicketPrice !== null && baseTicketPrice > 0;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Signed-in JKA members get the admin-set discount on premium tickets.
    const registrantIsMember =
        isPremium && user ? await isJkaMember(user.id) : false;
    const ticketPrice =
        isPremium && baseTicketPrice !== null
            ? registrantIsMember
                ? applyDiscount(baseTicketPrice, event.memberDiscountPercent)
                : baseTicketPrice
            : baseTicketPrice;

    const gates: EventGates = {
        id: event.id,
        dojoId: event.dojoId,
        eventDate: event.eventDate,
        participantType: event.participantType,
        minAge: event.minAge,
        minRank: event.minRank,
        isPremium,
        ticketPrice,
    };

    const viewer = await loadViewerContext(user?.id ?? null);
    const eligibility = checkEligibility(gates, viewer);
    if (!eligibility.ok) {
        return {
            ok: false,
            error:
                eligibility.reason ?? "You are not eligible for this event.",
        };
    }

    const userId = viewer.userId;
    let guestName: string | null = null;
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;

    if (!userId) {
        guestName = ((formData.get("name") as string) ?? "").trim() || null;
        guestEmail = normaliseEmail(formData.get("email") as string);
        guestPhone = ((formData.get("phone") as string) ?? "").trim() || null;

        if (!guestName) return { ok: false, error: "Your name is required." };
        if (!guestEmail) return { ok: false, error: "Your email is required." };
        if (!guestPhone) return { ok: false, error: "Your phone is required." };
    }

    // ── Gate answers collected on the form ─────────────────────────────
    let guestDateOfBirth: Date | null = null;
    if (eligibility.needsDateOfBirth) {
        const dobStr = ((formData.get("dateOfBirth") as string) ?? "").trim();
        const dob = dobStr ? new Date(dobStr) : null;
        if (!dob || Number.isNaN(dob.getTime())) {
            return {
                ok: false,
                error: "Your date of birth is required for this event.",
            };
        }
        if (event.minAge !== null && ageAt(dob, event.eventDate) < event.minAge) {
            return {
                ok: false,
                error: `Participants must be at least ${event.minAge} years old on the event date.`,
            };
        }
        guestDateOfBirth = dob;
    }

    let parentOfMemberNumber: string | null = null;
    if (eligibility.needsChildMemberNumber) {
        const memberNumber = ((formData.get("childMemberNumber") as string) ?? "").trim();
        if (!memberNumber) {
            return {
                ok: false,
                error: "Your child's member number is required for this event.",
            };
        }
        const child = await prisma.user.findUnique({
            where: { memberNumber },
            select: { id: true, student: { select: { id: true } } },
        });
        if (!child?.student) {
            return {
                ok: false,
                error: "No student found with that member number. Please check and try again.",
            };
        }
        parentOfMemberNumber = memberNumber;
    }

    const participantName = viewer.fullName ?? guestName ?? "Participant";
    const participantEmail = viewer.email ?? guestEmail ?? "";
    const participantPhone = viewer.phone ?? guestPhone ?? null;

    // Duplicate-guard before insert so we can return a friendly message instead
    // of a 23505 unique-violation. The DB has a partial unique index as a
    // backstop. A registration stuck on PENDING payment is resumed, not
    // duplicated.
    const existing = userId
        ? await prisma.eventRegistration.findFirst({
              where: { eventId, userId },
              select: { id: true, qrToken: true, paymentStatus: true, amountDue: true },
          })
        : guestEmail
          ? await prisma.eventRegistration.findFirst({
                where: {
                    eventId,
                    userId: null,
                    guestEmail: { equals: guestEmail, mode: "insensitive" },
                },
                select: { id: true, qrToken: true, paymentStatus: true, amountDue: true },
            })
          : null;

    if (existing) {
        if (existing.paymentStatus !== "PENDING") {
            return { ok: true, token: existing.qrToken };
        }
        // Resume the unpaid registration — send them back to the gateway.
        const init = await initiateTicketPayment({
            registrationId: existing.id,
            qrToken: existing.qrToken,
            amount: existing.amountDue ? Number(existing.amountDue) : (ticketPrice ?? 0),
            eventId: event.id,
            eventTitle: event.title,
            customerName: participantName,
            customerEmail: participantEmail,
            customerPhone: participantPhone,
        });
        if (init.kind === "gateway") {
            return { ok: true, token: existing.qrToken, payUrl: init.url };
        }
        if (init.kind === "devPaid") {
            return { ok: true, token: existing.qrToken };
        }
        return { ok: false, error: init.message };
    }

    const qrToken = urlSafeToken();
    const reg = await prisma.eventRegistration.create({
        data: {
            eventId,
            userId,
            guestName,
            guestEmail,
            guestPhone,
            qrToken,
            paymentStatus: isPremium ? "PENDING" : null,
            amountDue: isPremium ? ticketPrice : null,
            guestDateOfBirth,
            parentOfMemberNumber,
        },
        select: { id: true, qrToken: true },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/portal/admin/events/${eventId}/participants`);

    if (isPremium) {
        // The card is only issued once the ticket is paid. markRegistrationPaid
        // (called by the payment webhook, or directly in dev bypass) emits the
        // n8n confirmation.
        const init = await initiateTicketPayment({
            registrationId: reg.id,
            qrToken: reg.qrToken,
            amount: ticketPrice ?? 0,
            eventId: event.id,
            eventTitle: event.title,
            customerName: participantName,
            customerEmail: participantEmail,
            customerPhone: participantPhone,
        });
        if (init.kind === "gateway") {
            return { ok: true, token: reg.qrToken, payUrl: init.url };
        }
        if (init.kind === "devPaid") {
            return { ok: true, token: reg.qrToken };
        }
        // Gateway hiccup — the PENDING registration is kept; resubmitting
        // resumes it via the duplicate guard above.
        return { ok: false, error: init.message };
    }

    // Fire-and-forget — n8n handles the actual email + WhatsApp send.
    // emitWebhook never throws (see lib/n8n.ts), so a misconfigured n8n
    // cannot block a successful registration.
    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000";
    await emitEventRegistered({
        registrationId: reg.id,
        qrToken: reg.qrToken,
        participationCardUrl: `${appUrl}/participants/${reg.qrToken}`,
        participantName,
        participantEmail,
        participantPhone,
        memberId: userId ?? null,
        isGuest: !userId,
        event: {
            id: event.id,
            title: event.title,
            eventDate: event.eventDate.toISOString(),
            location: event.location,
            dojoName: event.dojo?.name ?? null,
        },
    });

    return { ok: true, token: reg.qrToken };
}

export async function registerForEventAndRedirect(
    formData: FormData,
): Promise<void> {
    const res = await registerForEventAction(formData);
    if (!res.ok) {
        const eventId = (formData.get("eventId") as string) ?? "";
        redirect(
            `/events/${eventId}/register?error=${encodeURIComponent(res.error)}`,
        );
    }
    // Premium events go through the payment gateway before the card.
    if (res.payUrl) redirect(res.payUrl);
    redirect(`/participants/${res.token}`);
}

/**
 * Resume payment for a PENDING premium registration, from the participation
 * card page. Token-based so guests can pay too — the qr token is the private
 * link to the registration.
 */
export async function payForRegistrationAction(formData: FormData): Promise<void> {
    const token = ((formData.get("token") as string) ?? "").trim();
    if (!token) redirect("/");

    const reg = await prisma.eventRegistration.findUnique({
        where: { qrToken: token },
        include: {
            event: { select: { id: true, title: true } },
            user: { select: { fullName: true, email: true, phone: true } },
        },
    });
    if (!reg) redirect("/");
    if (reg.paymentStatus !== "PENDING") {
        redirect(`/participants/${encodeURIComponent(token)}`);
    }

    // If this row is part of a multi-division payment group, resume the group
    // total rather than a single row's amount. The gateway session still runs
    // on this row's id; markRegistrationPaid fans PAID out to every sibling.
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
        customerEmail: reg.user?.email ?? reg.guestEmail ?? "",
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
 * posted personally). Returns details for the success page.
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

    // Premium tickets must be settled before the holder can enter.
    if (
        registration.paymentStatus === "PENDING" ||
        registration.paymentStatus === "FAILED"
    ) {
        return {
            ok: false,
            error: "This ticket has not been paid yet. Ask the participant to complete payment first.",
        };
    }

    // ADMIN can always check in. Dojo-scoped roles can check in for events
    // at their own dojo or events they posted personally.
    if (me.role === "DOJO_OWNER" || me.role === "DOJO_MANAGER") {
        const eventDojoId = registration.event.dojoId;
        const eventPostedById = registration.event.postedById;
        const isAllowed =
            (eventDojoId && eventDojoId === me.dojoId) ||
            eventPostedById === user.id;
        if (!isAllowed) {
            return {
                ok: false,
                error: "This event is not at your dojo.",
            };
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

// Sum amountDue across every row in a payment group so a resumed premium
// registration pays for the whole group rather than one row's slice. Falls
// back to the single row's amount when the row isn't grouped (legacy /
// single-division premium submissions).
async function groupTotalFor(reg: {
    id: string;
    paymentGroupId: string | null;
    amountDue: import("@/prisma/generated/client").Prisma.Decimal | null;
}): Promise<{ amount: number; count: number }> {
    if (!reg.paymentGroupId) {
        return {
            amount: reg.amountDue ? Number(reg.amountDue) : 0,
            count: 1,
        };
    }
    const siblings = await prisma.eventRegistration.findMany({
        where: { paymentGroupId: reg.paymentGroupId },
        select: { amountDue: true },
    });
    if (siblings.length === 0) {
        return {
            amount: reg.amountDue ? Number(reg.amountDue) : 0,
            count: 1,
        };
    }
    const amount = siblings.reduce(
        (t, s) => t + (s.amountDue ? Number(s.amountDue) : 0),
        0,
    );
    return { amount, count: siblings.length };
}

// ─────────────────────────────────────────────────────────────────────────
// TOURNAMENT REGISTRATION
// ─────────────────────────────────────────────────────────────────────────

type TournamentRegistrationResult =
    | { ok: true; token: string; payUrl?: string }
    | { ok: false; error: string };

function trim(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value.trim() : "";
}

function isGender(v: string): v is Gender {
    return v === "MALE" || v === "FEMALE";
}

export async function registerForTournamentAction(
    formData: FormData,
): Promise<TournamentRegistrationResult> {
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
            isPremium: true,
            ticketPrice: true,
            memberDiscountPercent: true,
            minAge: true,
            participantType: true,
            minRank: { select: { id: true, name: true, orderIndex: true } },
            dojo: { select: { name: true } },
            tournamentDetail: true,
            _count: { select: { registrations: true } },
        },
    });
    if (!event || !event.isPublished || !event.tournamentDetail) {
        return { ok: false, error: "Tournament not found." };
    }
    if (
        event.tournamentDetail.registrationDeadline &&
        event.tournamentDetail.registrationDeadline.getTime() < Date.now()
    ) {
        return { ok: false, error: "Registration for this tournament has closed." };
    }
    if (
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity
    ) {
        return { ok: false, error: "This event is fully booked." };
    }

    // ── Tournament-specific fields ──────────────────────────────────────
    // Collect the participant's division picks. `divisionCode` is the legacy
    // single-select input; the new form submits per-type codes so entrants
    // can enter a Kata and a Kumite division in one shot.
    const customDivisions = parseCustomDivisions(
        event.tournamentDetail.customDivisions,
    );
    const rawCodes = [
        trim(formData.get("divisionCode")),
        trim(formData.get("kataDivisionCode")),
        trim(formData.get("kumiteDivisionCode")),
    ].filter(Boolean);
    const codesToRegister = Array.from(new Set(rawCodes));
    if (codesToRegister.length === 0) {
        return { ok: false, error: "Pick a division to register for." };
    }

    const divisions = [] as Array<{
        code: string;
        division: NonNullable<ReturnType<typeof resolveDivision>>;
    }>;
    for (const code of codesToRegister) {
        if (!event.tournamentDetail.enabledDivisions.includes(code)) {
            return {
                ok: false,
                error: "That division is not open for this tournament.",
            };
        }
        const d = resolveDivision(code, customDivisions);
        if (!d) return { ok: false, error: "Unknown division." };
        divisions.push({ code, division: d });
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

    for (const { division } of divisions) {
        const issue = checkDivisionEligibility(division, {
            gender: genderRaw,
            dob,
            eventDate: event.eventDate,
            weightKg,
        });
        if (!issue) continue;
        const messages: Record<typeof issue, string> = {
            "wrong-event-type": "Division doesn't match the tournament type.",
            "wrong-gender": `${division.label} is for a different gender.`,
            "age-below-min": `You must be at least ${division.ageMin} on the event date for ${division.label}.`,
            "age-above-max": `You must be under ${(division.ageMax ?? 0) + 1} on the event date for ${division.label}.`,
            "weight-below-min": `Your weight is below ${division.label}'s range.`,
            "weight-above-max": `Your weight is above ${division.label}'s range.`,
            "weight-required": "Weight is required for kumite divisions.",
        };
        return { ok: false, error: messages[issue] };
    }

    // ── Common (member vs guest) ────────────────────────────────────────
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const registrantIsMember = user ? await isJkaMember(user.id) : false;
    const baseTicketPrice = event.ticketPrice ? Number(event.ticketPrice) : null;
    const isPremium = event.isPremium && baseTicketPrice !== null && baseTicketPrice > 0;
    const ticketPrice =
        isPremium && baseTicketPrice !== null
            ? registrantIsMember
                ? applyDiscount(baseTicketPrice, event.memberDiscountPercent)
                : baseTicketPrice
            : baseTicketPrice;

    // Premium tickets go through a single gateway session even when the
    // participant enters multiple divisions — the session's total is
    // ticketPrice × N, and every row shares a payment_group_id so the paid
    // mark fans out from the primary row when the webhook fires.
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

    const entrantBeltRank = trim(formData.get("entrantBeltRank")) || null;
    if (!entrantBeltRank) return { ok: false, error: "Belt rank is required." };
    const entrantDojoName = trim(formData.get("entrantDojoName")) || null;
    const coachName = trim(formData.get("coachName")) || null;
    const emergencyContactName = trim(formData.get("emergencyContactName")) || null;
    const emergencyContactPhone = trim(formData.get("emergencyContactPhone")) || null;
    if (!emergencyContactName || !emergencyContactPhone) {
        return { ok: false, error: "Emergency contact details are required." };
    }

    // Team kata: expect team name + two teammates. Third team member is the
    // registrant themself. The block is required if any selected division is
    // a team division; the payload is only written onto the team row(s).
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
                error: "Team name and both teammates are required for team kata.",
            };
        }
        teammates = [
            { name: t1n, memberNumber: trim(formData.get("teammate1Member")) || null },
            { name: t2n, memberNumber: trim(formData.get("teammate2Member")) || null },
        ];
    }

    // Minor guardian block — driven by age on the event date, computed with
    // the same helper the picker uses.
    const isMinor = ageOnDate(dob, event.eventDate) < 18;
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

    // Prevent double-entering the same division. Members are uniquely
    // identified by userId+eventId+divisionCode; guests by email. When the
    // participant selects multiple divisions we walk each one — divisions that
    // already have a paid entry are silently skipped, PENDING rows are resumed
    // (premium single-division only), new picks become fresh rows.
    type CreatedRow = { id: string; qrToken: string; divisionCode: string };
    const created: CreatedRow[] = [];
    let existingFallback: CreatedRow | null = null;
    let pendingExisting: {
        id: string;
        qrToken: string;
        amountDue: number | null;
    } | null = null;

    for (const { code, division } of divisions) {
        const existing = userId
            ? await prisma.eventRegistration.findFirst({
                  where: { eventId, userId, divisionCode: code },
                  select: {
                      id: true,
                      qrToken: true,
                      paymentStatus: true,
                      amountDue: true,
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
                        amountDue: true,
                    },
                })
              : null;

        if (existing) {
            if (existing.paymentStatus === "PENDING") {
                // Resume the unpaid registration. Premium is capped at a single
                // division per submit, so there's only ever one of these.
                pendingExisting = {
                    id: existing.id,
                    qrToken: existing.qrToken,
                    amountDue: existing.amountDue
                        ? Number(existing.amountDue)
                        : null,
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

        const qrToken = urlSafeToken();
        const reg = await prisma.eventRegistration.create({
            data: {
                eventId,
                userId,
                guestName,
                guestEmail,
                guestPhone,
                qrToken,
                paymentStatus: isPremium ? "PENDING" : null,
                amountDue: isPremium ? ticketPrice : null,
                // Per-row amountDue stays at the single-division price so
                // per-division accounting is preserved. The group id links
                // rows so one payment covers them all.
                paymentGroupId,
                divisionCode: code,
                entrantGender: genderRaw,
                // Weight only makes sense on kumite rows.
                entrantWeightKg:
                    division.eventType === "KUMITE" ? weightKg : null,
                entrantBeltRank,
                entrantDojoName,
                coachName,
                // Team block only lands on rows that represent a team division.
                teamName: division.isTeam ? teamName : null,
                teammates: (division.isTeam ? teammates : null) as never,
                guardianName,
                guardianPhone,
                guardianConsent,
                emergencyContactName,
                emergencyContactPhone,
                // Store DOB in the same guest_date_of_birth column used by the
                // existing gate-answers flow — one column, one meaning.
                guestDateOfBirth: dob,
            },
            select: { id: true, qrToken: true },
        });
        created.push({
            id: reg.id,
            qrToken: reg.qrToken,
            divisionCode: code,
        });
    }

    if (pendingExisting) {
        // Resume with the group total when the row belongs to a multi-division
        // payment group. Single-division rows just pay their own amountDue.
        const full = await prisma.eventRegistration.findUnique({
            where: { id: pendingExisting.id },
            select: { id: true, paymentGroupId: true, amountDue: true },
        });
        const groupTotal = full
            ? await groupTotalFor(full)
            : {
                  amount: pendingExisting.amountDue ?? ticketPrice ?? 0,
                  count: 1,
              };
        const init = await initiateTicketPayment({
            registrationId: pendingExisting.id,
            qrToken: pendingExisting.qrToken,
            amount: groupTotal.amount,
            eventId: event.id,
            eventTitle:
                groupTotal.count > 1
                    ? `${event.title} — ${groupTotal.count} divisions`
                    : event.title,
            customerName: user ? (guestName ?? "Participant") : (guestName ?? "Participant"),
            customerEmail: user?.email ?? guestEmail ?? "",
            customerPhone: guestPhone,
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
        // Everything the participant selected was already registered and paid.
        // Send them to the existing card so they can see their entry.
        if (existingFallback) return { ok: true, token: existingFallback.qrToken };
        return { ok: false, error: "You're already registered for that division." };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/portal/admin/events/${eventId}/participants`);

    if (isPremium) {
        // The primary row (first created) drives the gateway session, with
        // the summed total covering every sibling in the same payment group.
        const first = created[0];
        const perDivision = ticketPrice ?? 0;
        const totalAmount = perDivision * created.length;
        const init = await initiateTicketPayment({
            registrationId: first.id,
            qrToken: first.qrToken,
            amount: totalAmount,
            eventId: event.id,
            eventTitle:
                created.length > 1
                    ? `${event.title} — ${created.length} divisions`
                    : event.title,
            customerName: user ? "Participant" : (guestName ?? "Participant"),
            customerEmail: user?.email ?? guestEmail ?? "",
            customerPhone: guestPhone,
        });
        if (init.kind === "gateway") {
            return { ok: true, token: first.qrToken, payUrl: init.url };
        }
        if (init.kind === "devPaid") {
            return { ok: true, token: first.qrToken };
        }
        return { ok: false, error: init.message };
    }

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000";
    for (const row of created) {
        await emitEventRegistered({
            registrationId: row.id,
            qrToken: row.qrToken,
            participationCardUrl: `${appUrl}/participants/${row.qrToken}`,
            participantName: guestName ?? "Participant",
            participantEmail: user?.email ?? guestEmail ?? "",
            participantPhone: guestPhone,
            memberId: userId ?? null,
            isGuest: !userId,
            event: {
                id: event.id,
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
 * Form-action wrapper around checkInParticipantAction. Posted from the
 * participation card's "Mark as checked in" button. Always redirects back
 * to the same card so the result is reflected in the rendered page.
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
