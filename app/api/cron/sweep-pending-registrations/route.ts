import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// How long a PENDING event registration is kept before it's swept. A PENDING
// row is a checkout that was started but never confirmed by the payment
// webhook — most often an abandoned SSLCommerz redirect. Two hours is well
// past any legitimate gateway round-trip, so anything older is safe to drop.
const STALE_AFTER_MS = Number(
    process.env.PENDING_REGISTRATION_TTL_MS ?? 2 * 60 * 60 * 1000,
);

// Cron target — hits this endpoint (Vercel Cron or n8n) to delete stale
// PENDING event registrations. These no longer count toward capacity or
// participant lists (see lib/events/participant-count.ts), but sweeping them
// keeps event_registrations free of dead checkout attempts. FAILED rows are
// left in place as a record of a real attempt. If the buyer completes payment
// after the sweep, the webhook's lookup by id simply no-ops — the id is gone —
// which is the correct outcome for an abandoned-then-late payment.
export async function GET(request: Request) {
    // Optional shared secret. Cron dispatcher must pass ?key=... or
    // Authorization: Bearer <secret>.
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        const auth = request.headers.get("authorization");
        const providedBearer = auth?.startsWith("Bearer ")
            ? auth.slice(7)
            : null;
        if (key !== cronSecret && providedBearer !== cronSecret) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    const cutoff = new Date(Date.now() - STALE_AFTER_MS);

    const { count } = await prisma.eventRegistration.deleteMany({
        where: {
            paymentStatus: "PENDING",
            createdAt: { lt: cutoff },
        },
    });

    return NextResponse.json({ ok: true, deleted: count });
}
