import { NextResponse } from "next/server";
import { recordPaymentOutcome } from "@/lib/payments/log";

/**
 * SSLCommerz fail_url / cancel_url handler.
 *
 * SSLCommerz POSTs the form back here on non-success outcomes, so we can log
 * the transaction ourselves before bouncing the buyer back to the originating
 * page. Without this, the app would only know about failures indirectly —
 * from whatever the redirect landing page bothered to record.
 *
 * The final destination is encoded as ?next=<absolute-or-relative-url>, and
 * the outcome type (failed | cancelled) as ?kind=. Failure reason (if any)
 * comes off the SSLCommerz form.
 */
export async function POST(request: Request) {
    const url = new URL(request.url);
    const next = url.searchParams.get("next");
    const outcome = url.searchParams.get("kind") === "cancelled" ? "CANCELLED" : "FAILED";
    const orderId = url.searchParams.get("orderId");
    const eventRegistrationId = url.searchParams.get("eventRegistrationId");

    let reason: string | null = null;
    let valId: string | null = null;
    try {
        const form = await request.formData();
        reason =
            (form.get("error") as string | null) ||
            (form.get("failedreason") as string | null) ||
            null;
        valId = (form.get("val_id") as string | null) ?? null;
    } catch {
        // Non-form callback (e.g. GET fallback) — nothing to parse.
    }

    if (orderId || eventRegistrationId) {
        await recordPaymentOutcome({
            orderId,
            eventRegistrationId,
            status: outcome,
            reason:
                reason ??
                (outcome === "CANCELLED"
                    ? "Buyer cancelled the payment"
                    : "The payment gateway declined the transaction"),
            gatewayTxnId: valId,
        });
    }

    const target = next && next.startsWith("http") ? next : new URL(next ?? "/portal", request.url).toString();
    return NextResponse.redirect(target, 303);
}

// GET fallback — some browsers follow the redirect chain without preserving
// the POST body; the outcome still gets logged.
export async function GET(request: Request) {
    return POST(request);
}
