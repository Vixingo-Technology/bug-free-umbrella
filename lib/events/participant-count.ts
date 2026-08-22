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
// Unpaid rows are ignored: PENDING/FAILED rows are checkout attempts that
// never completed (an abandoned SSLCommerz redirect leaves a PENDING row).
// They must not eat a capacity slot or show up as a participant. Free events
// carry `paymentStatus = null` and paid entries flip to PAID/REFUNDED — those
// all count.
//
// Grace window: a PENDING row younger than PENDING_GRACE_MS is treated as a
// live, in-flight checkout and still reserves its slot, so two people can't
// both pay for the last spot during a normal gateway round-trip. Once it ages
// past the window it stops counting (and is later swept). FAILED rows never
// get the grace — a rejected payment is not in flight.
//
// The whole app funnels through these helpers so every display and every
// capacity gate agrees on the same figure.

const PENDING_GRACE_MS = Number(
    process.env.PENDING_GRACE_MS ?? 15 * 60 * 1000,
);

type CountableReg = {
    id: string;
    userId: string | null;
    paymentGroupId: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | null;
    createdAt: Date;
};

// A checkout that should not count toward the event. FAILED is always out;
// PENDING is out only once it ages past the grace window (older than
// `graceCutoff`), so live checkouts still hold their slot.
function isUnpaid(r: CountableReg, graceCutoff: Date): boolean {
    if (r.paymentStatus === "FAILED") return true;
    if (r.paymentStatus === "PENDING") return r.createdAt < graceCutoff;
    return false;
}

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
            paymentStatus: true,
            createdAt: true,
        },
    });
    const graceCutoff = new Date(Date.now() - PENDING_GRACE_MS);
    const seen = new Set<string>();
    for (const r of rows) {
        if (isUnpaid(r, graceCutoff)) continue;
        seen.add(participantKey(r));
    }
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
            paymentStatus: true,
            createdAt: true,
        },
    });
    const graceCutoff = new Date(Date.now() - PENDING_GRACE_MS);
    const buckets = new Map<string, Set<string>>();
    for (const r of rows) {
        if (isUnpaid(r, graceCutoff)) continue;
        const bucket = buckets.get(r.eventId) ?? new Set<string>();
        bucket.add(participantKey(r));
        buckets.set(r.eventId, bucket);
    }
    const out = new Map<string, number>();
    for (const [eventId, keys] of buckets) out.set(eventId, keys.size);
    return out;
}
