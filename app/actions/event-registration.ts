"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { emitEventRegistered } from "@/lib/n8n";

type ActionResult =
    | { ok: true; token: string }
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

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let memberId: string | null = null;
    let guestName: string | null = null;
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;

    let memberFullName: string | null = null;
    let memberEmail: string | null = null;
    let memberPhone: string | null = null;

    if (user) {
        // Signed-in members never need to supply name/email — those come from
        // the members table. They get the strict "one registration per member
        // per event" guarantee.
        const member = await prisma.member.findUnique({
            where: { id: user.id },
            select: { id: true, fullName: true, email: true, phone: true },
        });
        if (member) {
            memberId = member.id;
            memberFullName = member.fullName;
            memberEmail = member.email;
            memberPhone = member.phone;
        }
    }

    if (!memberId) {
        guestName = ((formData.get("name") as string) ?? "").trim() || null;
        guestEmail = normaliseEmail(formData.get("email") as string);
        guestPhone = ((formData.get("phone") as string) ?? "").trim() || null;

        if (!guestName) return { ok: false, error: "Your name is required." };
        if (!guestEmail) return { ok: false, error: "Your email is required." };
        if (!guestPhone) return { ok: false, error: "Your phone is required." };
    }

    // Duplicate-guard before insert so we can return a friendly message instead
    // of a 23505 unique-violation. The DB has a partial unique index as a
    // backstop.
    if (memberId) {
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, memberId },
            select: { qrToken: true },
        });
        if (existing) return { ok: true, token: existing.qrToken };
    } else if (guestEmail) {
        const existing = await prisma.eventRegistration.findFirst({
            where: {
                eventId,
                memberId: null,
                guestEmail: { equals: guestEmail, mode: "insensitive" },
            },
            select: { qrToken: true },
        });
        if (existing) return { ok: true, token: existing.qrToken };
    }

    const qrToken = urlSafeToken();
    const reg = await prisma.eventRegistration.create({
        data: {
            eventId,
            memberId,
            guestName,
            guestEmail,
            guestPhone,
            qrToken,
        },
        select: { id: true, qrToken: true },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/portal/admin/events/${eventId}/participants`);
    revalidatePath(`/portal/dojo/events/${eventId}/participants`);

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
        checkInUrl: `${appUrl}/check-in/${reg.qrToken}`,
        participantName: memberFullName ?? guestName ?? "Participant",
        participantEmail: memberEmail ?? guestEmail ?? "",
        participantPhone: memberPhone ?? guestPhone ?? null,
        memberId: memberId ?? null,
        isGuest: !memberId,
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
    redirect(`/participants/${res.token}`);
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

    const me = await prisma.member.findUnique({
        where: { id: user.id },
        select: { role: true, dojoId: true },
    });
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
            member: { select: { fullName: true } },
        },
    });
    if (!registration) {
        return { ok: false, error: "Invalid or unknown check-in code." };
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
        registration.member?.fullName ?? registration.guestName ?? "Participant";

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
        data: { checkedInAt, checkedInById: user.id },
    });

    revalidatePath(`/portal/admin/events/${registration.event.id}/participants`);
    revalidatePath(`/portal/dojo/events/${registration.event.id}/participants`);
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
