import "server-only";
import { prisma } from "@/lib/prisma";
import type {
    PaymentProvider,
    PaymentTransactionKind,
    PaymentTransactionStatus,
    Prisma,
} from "@/prisma/generated/client";

type BuyerInfo = {
    userId?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
};

type RecordAttemptInput = {
    orderId?: string | null;
    eventRegistrationId?: string | null;
    kind: PaymentTransactionKind;
    provider?: PaymentProvider;
    amount: number;
    currency?: string;
    buyer?: BuyerInfo;
    gatewayTxnId?: string | null;
    reason?: string | null;
};

/**
 * Insert a PENDING transaction log row when the user is handed off to the
 * gateway. The webhook later updates the row's status. Best-effort — if the
 * insert fails we log and move on so the payment itself isn't blocked.
 */
export async function recordPaymentAttempt(input: RecordAttemptInput) {
    try {
        await prisma.paymentTransaction.create({
            data: {
                orderId: input.orderId ?? null,
                eventRegistrationId: input.eventRegistrationId ?? null,
                userId: input.buyer?.userId ?? null,
                provider: input.provider ?? "SSLCOMMERZ",
                kind: input.kind,
                status: "PENDING",
                amount: input.amount,
                currency: input.currency ?? "BDT",
                gatewayTxnId: input.gatewayTxnId ?? null,
                reason: input.reason ?? null,
                buyerName: input.buyer?.name ?? null,
                buyerEmail: input.buyer?.email ?? null,
                buyerPhone: input.buyer?.phone ?? null,
            },
        });
    } catch (err) {
        console.error("[payment-log] attempt insert failed", err);
    }
}

type RecordOutcomeInput = {
    orderId?: string | null;
    eventRegistrationId?: string | null;
    status: PaymentTransactionStatus;
    gatewayTxnId?: string | null;
    reason?: string | null;
    // Fall-back fields — used only when no PENDING row exists (webhook
    // received without a matching attempt row, e.g. after a schema deploy).
    kind?: PaymentTransactionKind;
    provider?: PaymentProvider;
    amount?: number;
    currency?: string;
    buyer?: BuyerInfo;
};

/**
 * Advance the most-recent PENDING row for an order/event to a final status.
 * When no PENDING row exists (webhook without a matching attempt), insert a
 * fresh row in the final status so the log never misses the event.
 */
export async function recordPaymentOutcome(input: RecordOutcomeInput) {
    if (!input.orderId && !input.eventRegistrationId) {
        console.warn("[payment-log] outcome without orderId or eventRegistrationId");
        return;
    }
    try {
        const where: Prisma.PaymentTransactionWhereInput = { status: "PENDING" };
        if (input.orderId) where.orderId = input.orderId;
        if (input.eventRegistrationId) where.eventRegistrationId = input.eventRegistrationId;

        const existing = await prisma.paymentTransaction.findFirst({
            where,
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });

        if (existing) {
            await prisma.paymentTransaction.update({
                where: { id: existing.id },
                data: {
                    status: input.status,
                    gatewayTxnId: input.gatewayTxnId ?? undefined,
                    reason: input.reason ?? undefined,
                },
            });
            return;
        }

        if (input.amount == null || !input.kind) {
            console.warn(
                "[payment-log] outcome had no matching attempt row and no fallback fields",
            );
            return;
        }

        await prisma.paymentTransaction.create({
            data: {
                orderId: input.orderId ?? null,
                eventRegistrationId: input.eventRegistrationId ?? null,
                userId: input.buyer?.userId ?? null,
                provider: input.provider ?? "SSLCOMMERZ",
                kind: input.kind,
                status: input.status,
                amount: input.amount,
                currency: input.currency ?? "BDT",
                gatewayTxnId: input.gatewayTxnId ?? null,
                reason: input.reason ?? null,
                buyerName: input.buyer?.name ?? null,
                buyerEmail: input.buyer?.email ?? null,
                buyerPhone: input.buyer?.phone ?? null,
            },
        });
    } catch (err) {
        console.error("[payment-log] outcome upsert failed", err);
    }
}

/**
 * Derive the transaction kind from the flags on a ShopOrder. Falls back to
 * SHOP for orders that carry no membership / cert / renewal / transfer flag.
 */
export function kindForOrder(order: {
    includesMembership?: boolean;
    includesPastBeltFee?: boolean;
    includesCertificates?: boolean;
    includesDojoRenewal?: boolean;
    includesTransferRequest?: boolean;
    orderItems?: unknown[];
}): PaymentTransactionKind {
    if (order.includesCertificates) return "CERTIFICATES";
    if (order.includesDojoRenewal) return "DOJO_RENEWAL";
    if (order.includesTransferRequest) return "TRANSFER";
    if (order.includesPastBeltFee) return "PAST_BELT_FEE";
    if (order.includesMembership) return "MEMBERSHIP";
    if ((order.orderItems?.length ?? 0) > 0) return "SHOP";
    return "OTHER";
}
