import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEventRegistrationEmail } from "@/lib/email/send-event-registration";
import { notifyMembers } from "@/lib/notify";
import { recordPaymentAttempt, recordPaymentOutcome } from "@/lib/payments/log";

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
    // "register" = first-time ticket purchase, "add" = top-up on an existing
    // registration via the add-divisions flow. Controls which post-payment
    // landing pages the buyer returns to.
    flow?: "register" | "add";
}): Promise<TicketPaymentInit> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

    if (!storeId || storeId === "your-sslcommerz-store-id") {
        // Dev mode: simulate a successful payment.
        await markRegistrationPaid(input.registrationId, "DEV-BYPASS");
        await recordPaymentOutcome({
            eventRegistrationId: input.registrationId,
            status: "SUCCESS",
            provider: "DEV_BYPASS",
            kind: "EVENT_TICKET",
            amount: input.amount,
            buyer: {
                name: input.customerName,
                email: input.customerEmail,
                phone: input.customerPhone,
            },
        });
        return { kind: "devPaid" };
    }

    const base = appUrl();
    const gatewayUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const cusPhone = input.customerPhone?.trim() || null;
    const cusEmail = input.customerEmail?.trim() || null;
    if (!cusPhone) {
        return {
            kind: "error",
            message: "A phone number is required to pay for the ticket.",
        };
    }
    if (!cusEmail) {
        return {
            kind: "error",
            message: "A contact email is required to pay for the ticket.",
        };
    }

    const flow = input.flow ?? "register";
    const flowQuery = flow === "add" ? `&flow=add` : "";
    const failPath =
        flow === "add" ? "/events/add-divisions-failed" : "/events/payment-failed";

    const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword!,
        total_amount: input.amount.toFixed(2),
        currency: "BDT",
        tran_id: input.registrationId,
        success_url: `${base}/api/webhooks/sslcommerz/event-success?regId=${input.registrationId}${flowQuery}`,
        fail_url: `${base}${failPath}?regId=${input.registrationId}&eventId=${input.eventId}`,
        cancel_url: `${base}${failPath}?regId=${input.registrationId}&eventId=${input.eventId}&cancelled=1`,
        ipn_url: `${base}/api/webhooks/sslcommerz`,
        cus_name: input.customerName,
        cus_email: cusEmail,
        cus_phone: cusPhone,
        cus_add1: "Bangladesh",
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: `Ticket — ${input.eventTitle}`.slice(0, 100),
        product_category: "Event Ticket",
        product_profile: "general",
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
            await recordPaymentAttempt({
                eventRegistrationId: input.registrationId,
                kind: "EVENT_TICKET",
                amount: input.amount,
                buyer: {
                    name: input.customerName,
                    email: input.customerEmail,
                    phone: input.customerPhone,
                },
            });
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
            user: {
                select: {
                    fullName: true,
                    email: true,
                    contactEmail: true,
                    phone: true,
                },
            },
        },
    });
    if (!reg) return { ok: false, qrToken: null };
    if (reg.paymentStatus === "PAID") return { ok: true, qrToken: reg.qrToken };

    const paidAt = new Date();
    await prisma.eventRegistration.update({
        where: { id: reg.id },
        data: {
            paymentStatus: "PAID",
            paidAt,
            transactionId,
        },
    });

    // Fan the paid mark out to sibling rows in the same payment group. This
    // covers multi-division tournament submissions where one gateway session
    // pays for both entries.
    if (reg.paymentGroupId) {
        await prisma.eventRegistration.updateMany({
            where: {
                paymentGroupId: reg.paymentGroupId,
                id: { not: reg.id },
                paymentStatus: "PENDING",
            },
            data: {
                paymentStatus: "PAID",
                paidAt,
                transactionId,
            },
        });
    }

    // Merge "shadow" addon-only rows' new addons into their parent
    // registration's selectedOptionalFees. A shadow row is created by the
    // add-flow when a member pays for add-ons on a division they had
    // already registered for; the shadow itself stays as an audit record
    // (its qrToken can still link back to a live card), but the parent
    // row's fee snapshot is updated so the primary registration reflects
    // every add-on the member has paid for.
    const shadows = await prisma.eventRegistration.findMany({
        where: reg.paymentGroupId
            ? {
                  paymentGroupId: reg.paymentGroupId,
                  parentRegistrationId: { not: null },
                  paymentStatus: "PAID",
              }
            : {
                  id: reg.id,
                  parentRegistrationId: { not: null },
                  paymentStatus: "PAID",
              },
        select: {
            id: true,
            parentRegistrationId: true,
            selectedOptionalFees: true,
        },
    });

    type SnapshotFee = { id: string; name: string; amountBdt: number };
    function parseSnapshot(raw: unknown): SnapshotFee[] {
        if (!Array.isArray(raw)) return [];
        return raw
            .filter(
                (r): r is Record<string, unknown> =>
                    !!r && typeof r === "object",
            )
            .map((r) => ({
                id: typeof r.id === "string" ? r.id : "",
                name: typeof r.name === "string" ? r.name : "",
                amountBdt:
                    typeof r.amountBdt === "number"
                        ? r.amountBdt
                        : Number(r.amountBdt ?? 0),
            }))
            .filter((f) => !!f.id);
    }

    const shadowsByParent = new Map<string, SnapshotFee[]>();
    for (const s of shadows) {
        if (!s.parentRegistrationId) continue;
        const bucket = shadowsByParent.get(s.parentRegistrationId) ?? [];
        for (const a of parseSnapshot(s.selectedOptionalFees)) {
            if (!bucket.some((x) => x.id === a.id)) bucket.push(a);
        }
        shadowsByParent.set(s.parentRegistrationId, bucket);
    }

    for (const [parentId, addons] of shadowsByParent) {
        const parent = await prisma.eventRegistration.findUnique({
            where: { id: parentId },
            select: { selectedOptionalFees: true },
        });
        if (!parent) continue;
        const existing = parseSnapshot(parent.selectedOptionalFees);
        const merged = [
            ...existing,
            ...addons.filter((a) => !existing.some((e) => e.id === a.id)),
        ];
        if (merged.length === existing.length) continue;
        await prisma.eventRegistration.update({
            where: { id: parentId },
            data: { selectedOptionalFees: merged as never },
        });
    }

    // If the primary row is a shadow (addon-only top-up), its token points at
    // a row we're about to delete — resolve the parent's qrToken for the
    // outbound card/invoice links so the email lands on a live card.
    let effectiveToken = reg.qrToken;
    if (reg.parentRegistrationId) {
        const parentTok = await prisma.eventRegistration.findUnique({
            where: { id: reg.parentRegistrationId },
            select: { qrToken: true },
        });
        if (parentTok?.qrToken) effectiveToken = parentTok.qrToken;
    }
    const cardUrl = `${appUrl()}/participants/${effectiveToken}`;
    const invoiceUrl = `${appUrl()}/invoices/${effectiveToken}`;
    const userAuthEmail = reg.user?.email ?? null;
    const realUserEmail =
        userAuthEmail && !userAuthEmail.endsWith("@members.jkabangladesh.com")
            ? userAuthEmail
            : null;
    const recipientEmail =
        reg.user?.contactEmail ?? reg.guestEmail ?? realUserEmail;
    const participantName =
        reg.user?.fullName ?? reg.guestName ?? "Participant";

    // Sum sibling rows so the paid amount reflects the whole payment group
    // when the participant registered for multiple divisions in one submit.
    const groupAmount = reg.paymentGroupId
        ? await prisma.eventRegistration
              .aggregate({
                  where: { paymentGroupId: reg.paymentGroupId },
                  _sum: { amountDue: true },
              })
              .then((r) => (r._sum.amountDue ? Number(r._sum.amountDue) : null))
        : reg.amountDue
          ? Number(reg.amountDue)
          : null;

    await sendEventRegistrationEmail(recipientEmail, {
        participantName,
        participationCardUrl: cardUrl,
        invoiceUrl,
        isPaid: true,
        amountPaidBdt: groupAmount,
        event: {
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
            link: `/participants/${effectiveToken}`,
        });
    }

    revalidatePath(`/participants/${effectiveToken}`);
    revalidatePath(`/events/${reg.event.id}`);
    revalidatePath(`/portal/admin/events/${reg.event.id}/participants`);
    revalidatePath(`/portal/events`);

    return { ok: true, qrToken: effectiveToken };
}
