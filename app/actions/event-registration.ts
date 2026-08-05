"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { emitEventRegistered } from "@/lib/n8n";
import { initiateTicketPayment } from "@/lib/events/ticket-payment";
import { applyDiscount, isJkaMember } from "@/lib/auth/is-jka-member";
import { uploadImageIfPresent } from "@/lib/attachment-upload";
import {
    ageOnDate,
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
            event: { select: { id: true, title: true } },
            user: { select: { fullName: true, email: true, phone: true } },
        },
    });
    if (!reg) redirect("/");
    if (reg.paymentStatus !== "PENDING") {
        redirect(`/participants/${encodeURIComponent(token)}`);
    }

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
            memberDiscountPercent: true,
            // Event-wide base ticket, added on top of the selected division
            // fees. Null / 0 = no base ticket.
            ticketPrice: true,
            // Optional % discount applied when the participant picks 2+
            // divisions. Applied to the summed division fees only, not to
            // the base ticket.
            multiDivisionDiscountPercent: true,
            dojo: { select: { name: true } },
            tournamentDetail: true,
            _count: { select: { registrations: true } },
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
    if (
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity
    ) {
        return { ok: false, error: "This event is fully booked." };
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
    if (customDivisions.length > 0 && codesToRegister.length === 0) {
        return { ok: false, error: "Pick at least one division to register for." };
    }

    const divisions: Array<{ code: string; division: CustomDivision }> = [];
    for (const code of codesToRegister) {
        const d = resolveDivision(code, customDivisions);
        if (!d) return { ok: false, error: `Unknown division: ${code}.` };
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

    const entrantAge = ageOnDate(dob, event.eventDate);

    const entrantBeltRank = trim(formData.get("entrantBeltRank")) || null;
    // Belt rank is only mandatory when the event actually offers divisions
    // (divisions may gate on rank). Ticket-only events don't need it.
    if (divisions.length > 0 && !entrantBeltRank) {
        return { ok: false, error: "Belt rank is required." };
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

    // Compute per-division prices (required fees + chosen optional fees),
    // applying the member discount to each. When 2+ divisions are selected,
    // the event's multi-division discount is applied on top.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const pricePerCode = new Map<string, number>();
    let divisionsSubtotal = 0;
    for (const { code, division } of divisions) {
        let base = 0;
        if (division.fees && division.fees.length > 0) {
            for (const f of division.fees) {
                if (f.required || chosenOptional.has(`${code}:${f.id}`)) {
                    base += f.amountBdt;
                }
            }
        } else {
            base = division.priceBdt ?? 0;
        }
        let effective = base;
        if (effective > 0 && registrantIsMember) {
            effective = applyDiscount(effective, event.memberDiscountPercent);
        }
        if (effective > 0 && divisions.length >= 2) {
            effective = applyDiscount(
                effective,
                event.multiDivisionDiscountPercent,
            );
        }
        effective = round2(effective);
        pricePerCode.set(code, effective);
        divisionsSubtotal += effective;
    }
    divisionsSubtotal = round2(divisionsSubtotal);

    // Optional event-wide base ticket (paid once per registration group).
    // Applies the member discount but not the multi-division discount.
    let ticketAmount = 0;
    if (event.ticketPrice !== null && Number(event.ticketPrice) > 0) {
        const t = Number(event.ticketPrice);
        ticketAmount = round2(
            registrantIsMember
                ? applyDiscount(t, event.memberDiscountPercent)
                : t,
        );
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
            select: { id: true, paymentGroupId: true, amountDue: true },
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
            customerName: guestName ?? "Participant",
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
            customerName: user ? "Participant" : (guestName ?? "Participant"),
            customerEmail: user?.email ?? guestEmail ?? "",
            customerPhone: guestPhone,
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
