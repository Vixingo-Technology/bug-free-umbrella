import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { emitEventRegistered } from "@/lib/n8n";
import { notifyMembers } from "@/lib/notify";

export type TicketPaymentInit =
    | { kind: "gateway"; url: string }
    | { kind: "devPaid" } // SSLCommerz not configured — marked paid directly
    | { kind: "error"; message: string };

function appUrl(): string {
    return (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000"
    );
}

/**
 * Start an SSLCommerz session for a PENDING event registration. Follows the
 * same conventions as the shop checkout (sandbox by default, dev bypass when
 * the store isn't configured). tran_id is the registration id.
 */
export async function initiateTicketPayment(input: {
    registrationId: string;
    qrToken: string;
    amount: number;
    eventId: string;
    eventTitle: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
}): Promise<TicketPaymentInit> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

    if (!storeId || storeId === "your-sslcommerz-store-id") {
        // Dev mode: simulate a successful payment.
        await markRegistrationPaid(input.registrationId, "DEV-BYPASS");
        return { kind: "devPaid" };
    }

    const base = appUrl();
    const gatewayUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword!,
        total_amount: input.amount.toFixed(2),
        currency: "BDT",
        tran_id: input.registrationId,
        success_url: `${base}/api/webhooks/sslcommerz/event-success?regId=${input.registrationId}`,
        fail_url: `${base}/participants/${input.qrToken}?payfailed=1`,
        cancel_url: `${base}/participants/${input.qrToken}`,
        ipn_url: `${base}/api/webhooks/sslcommerz`,
        cus_name: input.customerName,
        cus_email: input.customerEmail,
        cus_phone: input.customerPhone ?? "01XXXXXXXXX",
        cus_add1: "Bangladesh",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: `Ticket — ${input.eventTitle}`.slice(0, 100),
        product_category: "Event Ticket",
        product_profile: "non-physical-goods",
        num_of_item: "1",
    });

    try {
        const res = await fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const json = await res.json();
        if (json.status === "SUCCESS" && json.GatewayPageURL) {
            return { kind: "gateway", url: json.GatewayPageURL };
        }
        return {
            kind: "error",
            message:
                json.failedreason ?? "Payment gateway error. Please try again.",
        };
    } catch {
        return {
            kind: "error",
            message: "Could not reach the payment gateway. Please try again.",
        };
    }
}

/**
 * Flip a PENDING registration to PAID and run the post-payment side effects
 * (n8n welcome webhook, in-app notification, cache revalidation). Idempotent —
 * a second call for an already-PAID registration is a no-op.
 */
export async function markRegistrationPaid(
    registrationId: string,
    transactionId: string,
): Promise<{ ok: boolean; qrToken: string | null }> {
    const reg = await prisma.eventRegistration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    eventDate: true,
                    location: true,
                    dojo: { select: { name: true } },
                },
            },
            user: { select: { fullName: true, email: true, phone: true } },
        },
    });
    if (!reg) return { ok: false, qrToken: null };
    if (reg.paymentStatus === "PAID") return { ok: true, qrToken: reg.qrToken };

    await prisma.eventRegistration.update({
        where: { id: reg.id },
        data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            transactionId,
        },
    });

    const cardUrl = `${appUrl()}/participants/${reg.qrToken}`;
    await emitEventRegistered({
        registrationId: reg.id,
        qrToken: reg.qrToken,
        participationCardUrl: cardUrl,
        participantName: reg.user?.fullName ?? reg.guestName ?? "Participant",
        participantEmail: reg.user?.email ?? reg.guestEmail ?? "",
        participantPhone: reg.user?.phone ?? reg.guestPhone ?? null,
        memberId: reg.userId,
        isGuest: !reg.userId,
        event: {
            id: reg.event.id,
            title: reg.event.title,
            eventDate: reg.event.eventDate.toISOString(),
            location: reg.event.location,
            dojoName: reg.event.dojo?.name ?? null,
        },
    });

    if (reg.userId) {
        await notifyMembers([reg.userId], {
            title: "Ticket confirmed",
            message: `Your ticket for "${reg.event.title}" is confirmed. See you there!`,
            type: "PAYMENT",
            link: `/participants/${reg.qrToken}`,
        });
    }

    revalidatePath(`/participants/${reg.qrToken}`);
    revalidatePath(`/events/${reg.event.id}`);
    revalidatePath(`/portal/admin/events/${reg.event.id}/participants`);

    return { ok: true, qrToken: reg.qrToken };
}
