import { prisma } from "@/lib/prisma";

// Counting event registrations is not the same as counting people:
//   1. A tournament participant can enter multiple divisions in one submit —
//      those rows share a `paymentGroupId`.
//   2. The same person can also submit multiple times (e.g. add another
//      division later, or re-submit after a payment failure).
// Raw `prisma.eventRegistration.count()` (or the `_count.registrations`
// include) treats every row as its own entry, so a single 3-division submit
// registers as "3 RSVPs".
//
// Dedup key, most specific first:
//   member  → userId
//   guest   → normalised guestEmail (case-insensitive), else guestPhone
//   group   → paymentGroupId (multi-division submit without contact info)
//   row     → id (last resort — anonymous single submit)
//
// The whole app funnels through these helpers so every display and every
// capacity gate agrees on the same figure.

type CountableReg = {
    id: string;
    userId: string | null;
    paymentGroupId: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
};

function participantKey(r: CountableReg): string {
    if (r.userId) return `u:${r.userId}`;
    const email = r.guestEmail?.trim().toLowerCase();
    if (email) return `e:${email}`;
    const phone = r.guestPhone?.trim();
    if (phone) return `p:${phone}`;
    if (r.paymentGroupId) return `g:${r.paymentGroupId}`;
    return `r:${r.id}`;
}

export async function countUniqueParticipants(eventId: string): Promise<number> {
    const rows = await prisma.eventRegistration.findMany({
        where: { eventId },
        select: {
            id: true,
            userId: true,
            paymentGroupId: true,
            guestEmail: true,
            guestPhone: true,
        },
    });
    const seen = new Set<string>();
    for (const r of rows) seen.add(participantKey(r));
    return seen.size;
}

export async function countUniqueParticipantsByEvent(
    eventIds: string[],
): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const rows = await prisma.eventRegistration.findMany({
        where: { eventId: { in: eventIds } },
        select: {
            eventId: true,
            id: true,
            userId: true,
            paymentGroupId: true,
            guestEmail: true,
            guestPhone: true,
        },
    });
    const buckets = new Map<string, Set<string>>();
    for (const r of rows) {
        const bucket = buckets.get(r.eventId) ?? new Set<string>();
        bucket.add(participantKey(r));
        buckets.set(r.eventId, bucket);
    }
    const out = new Map<string, number>();
    for (const [eventId, keys] of buckets) out.set(eventId, keys.size);
    return out;
}
