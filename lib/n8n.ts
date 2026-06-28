/**
 * n8n Webhook Emitter
 *
 * Emits events to n8n automation workflows running on the Hetzner VPS.
 * All side effects (email, WhatsApp, digital membership card) go through
 * n8n — never directly from Next.js.
 *
 * Events follow the pattern: `jka.<resource>.<action>`
 *   e.g. jka.member.created, jka.payment.success, jka.grading.result
 */

export type N8nEvent =
    | "jka.member.created"
    | "jka.payment.success"
    | "jka.grading.result"
    | "jka.grading.reminder"
    | "jka.renewal.reminder"
    | "jka.event.registered"
    | "jka.notification.created";

/**
 * Fire-and-forget webhook to n8n. Non-fatal — logs errors but never throws.
 * Safe to call from any server action or API route.
 */
export async function emitWebhook(
    event: N8nEvent,
    payload: Record<string, unknown>
): Promise<void> {
    const baseUrl = process.env.N8N_BASE_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;

    if (!baseUrl || !secret) {
        // n8n not configured — skip silently in dev / CI
        if (process.env.NODE_ENV === "development") {
            console.log(`[n8n] Would emit: ${event}`, payload);
        }
        return;
    }

    const url = `${baseUrl}/webhook/${event}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-webhook-secret": secret,
            },
            body: JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                ...payload,
            }),
        });

        if (!res.ok) {
            console.error(`[n8n] Webhook ${event} failed: HTTP ${res.status}`);
        }
    } catch (err) {
        // Network error — log and continue, never throw
        console.error(`[n8n] Webhook ${event} error:`, err);
    }
}

// ── Typed helpers for common events ──────────────────────────────────────────

export async function emitMemberCreated(member: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    currentRank: string;
    dojoName?: string | null;
}) {
    await emitWebhook("jka.member.created", { member });
}

export async function emitPaymentSuccess(payload: {
    memberId: string;
    memberFullName: string;
    memberEmail: string;
    orderId: string;
    total: number;
    currency: string;
    includesMembership: boolean;
    membershipExpiresAt?: string;
}) {
    await emitWebhook("jka.payment.success", payload);
}

export async function emitGradingResult(payload: {
    memberId: string;
    memberFullName: string;
    memberEmail: string;
    memberPhone?: string | null;
    fromRank: string;
    toRank: string;
    result: "PASSED" | "FAILED" | "ABSENT";
    eventName?: string;
    certificateUrl?: string | null;
}) {
    await emitWebhook("jka.grading.result", payload);
}

/**
 * Emitted when someone registers for an event. n8n is expected to email the
 * participant their participation card (link to participationCardUrl) and,
 * if configured, send a WhatsApp message too.
 *
 * The participation card page renders the QR — the email itself only needs
 * to include the link and the basic event details; the participant opens
 * the card on their phone to scan at the door.
 */
export async function emitEventRegistered(payload: {
    registrationId: string;
    qrToken: string;
    participationCardUrl: string;
    checkInUrl: string;
    participantName: string;
    participantEmail: string;
    participantPhone?: string | null;
    memberId?: string | null;
    isGuest: boolean;
    event: {
        id: string;
        title: string;
        eventDate: string; // ISO
        location?: string | null;
        dojoName?: string | null;
    };
}) {
    await emitWebhook("jka.event.registered", payload);
}
