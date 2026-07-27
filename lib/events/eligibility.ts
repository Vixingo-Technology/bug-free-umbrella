import "server-only";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser, type RoleId } from "@/lib/auth/load-current-user";
import type { EventParticipantType } from "@/prisma/generated/client";

/** The gate-relevant slice of an event. */
export type EventGates = {
    id: string;
    dojoId: string | null;
    eventDate: Date;
    participantType: EventParticipantType;
    minAge: number | null;
    minRank: { id: string; name: string; orderIndex: number } | null;
    isPremium: boolean;
    ticketPrice: number | null;
};

/** Everything we know about the person trying to register. */
export type ViewerContext = {
    userId: string | null;
    role: RoleId | null;
    dojoId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    /** Present only when the viewer is a student. */
    student: {
        currentRank: string;
        rankOrderIndex: number | null; // null when currentRank doesn't match belt_ranks
        dateOfBirth: Date | null;
    } | null;
};

export type EligibilityResult = {
    ok: boolean;
    /** Human-readable reason when ok is false. */
    reason: string | null;
    /** True when signing in (with the right account) could fix it. */
    requiresSignIn: boolean;
    /** Form must collect a date of birth to verify the minimum age. */
    needsDateOfBirth: boolean;
    /** Form must collect the child's member number (parents-only events). */
    needsChildMemberNumber: boolean;
};

export const PARTICIPANT_TYPE_LABEL: Record<EventParticipantType, string> = {
    PUBLIC: "Open to everyone",
    STUDENTS: "Students only",
    INSTRUCTORS: "Teachers only",
    PARENTS: "Parents only",
    DOJO_MEMBERS: "Dojo members only",
};

export async function loadViewerContext(
    userId: string | null,
): Promise<ViewerContext> {
    if (!userId) {
        return {
            userId: null,
            role: null,
            dojoId: null,
            fullName: null,
            email: null,
            phone: null,
            student: null,
        };
    }

    const me = await loadCurrentUser(userId);
    if (!me) {
        return {
            userId: null,
            role: null,
            dojoId: null,
            fullName: null,
            email: null,
            phone: null,
            student: null,
        };
    }

    let student: ViewerContext["student"] = null;
    if (me.role === "STUDENT") {
        const s = await prisma.student.findUnique({
            where: { id: userId },
            select: { currentRank: true, user: { select: { profile: { select: { dateOfBirth: true } } } } },
        });
        if (s) {
            const rank = await prisma.beltRank.findUnique({
                where: { name: s.currentRank },
                select: { orderIndex: true },
            });
            student = {
                currentRank: s.currentRank,
                rankOrderIndex: rank?.orderIndex ?? null,
                dateOfBirth: s.user.profile?.dateOfBirth ?? null,
            };
        }
    }

    return {
        userId: me.userId,
        role: me.role,
        dojoId: me.dojoId,
        fullName: me.fullName,
        email: me.email,
        phone: me.phone,
        student,
    };
}

export function ageAt(dateOfBirth: Date, onDate: Date): number {
    let age = onDate.getFullYear() - dateOfBirth.getFullYear();
    const beforeBirthday =
        onDate.getMonth() < dateOfBirth.getMonth() ||
        (onDate.getMonth() === dateOfBirth.getMonth() &&
            onDate.getDate() < dateOfBirth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
}

/**
 * Check whether the viewer can register for the event. This is the single
 * source of truth used by the register page (to shape the form) and the
 * server action (to enforce on submit).
 *
 * Notes on rule interplay:
 * - minRank applies to students (guests must sign in so we can verify);
 *   instructor/admin/dojo-staff viewers are exempt — they are past the
 *   student rank ladder.
 * - minAge is verified from the student profile when we have a date of
 *   birth on file, otherwise the form collects one (needsDateOfBirth).
 */
export function checkEligibility(
    event: EventGates,
    viewer: ViewerContext,
): EligibilityResult {
    const res: EligibilityResult = {
        ok: true,
        reason: null,
        requiresSignIn: false,
        needsDateOfBirth: false,
        needsChildMemberNumber: false,
    };

    // ── Participant type ────────────────────────────────────────────────
    switch (event.participantType) {
        case "PUBLIC":
            break;
        case "STUDENTS":
            if (!viewer.userId) {
                return {
                    ...res,
                    ok: false,
                    requiresSignIn: true,
                    reason: "This event is for JKA students only. Sign in with your student account to register.",
                };
            }
            if (viewer.role !== "STUDENT") {
                return {
                    ...res,
                    ok: false,
                    reason: "This event is open to students only.",
                };
            }
            break;
        case "INSTRUCTORS":
            if (!viewer.userId) {
                return {
                    ...res,
                    ok: false,
                    requiresSignIn: true,
                    reason: "This event is for instructors only. Sign in with your instructor account to register.",
                };
            }
            if (viewer.role !== "INSTRUCTOR") {
                return {
                    ...res,
                    ok: false,
                    reason: "This event is open to instructors only.",
                };
            }
            break;
        case "PARENTS":
            // Parents may register as guests — but they must name the
            // student they are a guardian of.
            res.needsChildMemberNumber = true;
            break;
        case "DOJO_MEMBERS":
            if (!viewer.userId) {
                return {
                    ...res,
                    ok: false,
                    requiresSignIn: true,
                    reason: "This event is for dojo members only. Sign in to register.",
                };
            }
            if (event.dojoId && viewer.dojoId !== event.dojoId) {
                return {
                    ...res,
                    ok: false,
                    reason: "This event is reserved for members of the hosting dojo.",
                };
            }
            break;
    }

    // ── Minimum belt rank ───────────────────────────────────────────────
    if (event.minRank) {
        if (!viewer.userId) {
            return {
                ...res,
                ok: false,
                requiresSignIn: true,
                reason: `This event requires at least ${event.minRank.name}. Sign in so we can verify your rank.`,
            };
        }
        if (viewer.role === "STUDENT") {
            const order = viewer.student?.rankOrderIndex;
            if (order === null || order === undefined) {
                return {
                    ...res,
                    ok: false,
                    reason: "We couldn't verify your belt rank. Please contact your dojo.",
                };
            }
            if (order < event.minRank.orderIndex) {
                return {
                    ...res,
                    ok: false,
                    reason: `This event requires at least ${event.minRank.name}. Your current rank is ${viewer.student?.currentRank}.`,
                };
            }
        }
        // Instructors, admins, and dojo staff are exempt from the rank gate.
    }

    // ── Minimum age ─────────────────────────────────────────────────────
    if (event.minAge !== null) {
        const dob = viewer.student?.dateOfBirth ?? null;
        if (dob) {
            if (ageAt(dob, event.eventDate) < event.minAge) {
                return {
                    ...res,
                    ok: false,
                    reason: `Participants must be at least ${event.minAge} years old on the event date.`,
                };
            }
        } else {
            // No date of birth on file — collect it on the form and verify
            // again at submit time.
            res.needsDateOfBirth = true;
        }
    }

    return res;
}

/**
 * Load only the gate-relevant fields of an event. Returns null if the event
 * doesn't exist or isn't published.
 */
export async function loadEventGates(
    eventId: string,
): Promise<EventGates | null> {
    const e = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            dojoId: true,
            eventDate: true,
            isPublished: true,
            participantType: true,
            minAge: true,
            isPremium: true,
            ticketPrice: true,
            minRank: { select: { id: true, name: true, orderIndex: true } },
        },
    });
    if (!e || !e.isPublished) return null;
    return {
        id: e.id,
        dojoId: e.dojoId,
        eventDate: e.eventDate,
        participantType: e.participantType,
        minAge: e.minAge,
        minRank: e.minRank,
        isPremium: e.isPremium,
        ticketPrice: e.ticketPrice ? Number(e.ticketPrice) : null,
    };
}
