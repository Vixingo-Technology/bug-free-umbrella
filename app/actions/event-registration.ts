"use server";

import { randomBytes } from "node:crypto";
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

    const ticketPrice = event.ticketPrice ? Number(event.ticketPrice) : null;
    const isPremium = event.isPremium && ticketPrice !== null && ticketPrice > 0;

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

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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
        const child = await prisma.student.findUnique({
            where: { memberNumber },
            select: { id: true },
        });
        if (!child) {
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

    const init = await initiateTicketPayment({
        registrationId: reg.id,
        qrToken: reg.qrToken,
        amount: reg.amountDue ? Number(reg.amountDue) : 0,
        eventId: reg.event.id,
        eventTitle: reg.event.title,
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
