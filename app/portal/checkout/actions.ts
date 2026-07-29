"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── Initiate SSLCommerz payment ─────────────────────────────────────────────

export async function initiatePaymentAction(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const order = await prisma.shopOrder.findUnique({
            where: { id: orderId, userId: user.id },
            include: {
                user: { include: { student: true, profile: true } },
                orderItems: { include: { product: true } },
                transferRequest: { select: { id: true } },
                dojo: { select: { id: true } },
            },
        });

        if (!order) return { error: "Order not found." };
        if (!order.user) return { error: "Order is not linked to your account." };
        if (order.paymentStatus === "PAID") return { error: "This order is already paid." };

        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

        // If SSLCommerz not configured, use dev bypass
        if (!storeId || storeId === "your-sslcommerz-store-id") {
            // Dev mode: simulate payment success. Renewal orders route to
            // their originating page so we hit the same success handler as
            // production.
            if (order.includesDojoRenewal) {
                redirect(`/portal/dojo/renewals?status=success&orderId=${orderId}&dev=1`);
            }
            if (order.includesPastBeltFee) {
                redirect(`/portal/joining?status=success&orderId=${orderId}&dev=1`);
            }
            if (order.includesMembership && !order.orderItems.length) {
                redirect(`/portal/renew?status=success&orderId=${orderId}&dev=1`);
            }
            redirect(`/portal/payment-success?orderId=${orderId}&dev=1`);
        }

        const appUrl = process.env.APP_URL ?? "http://localhost:3000";
        const baseUrl = isSandbox
            ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
            : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

        const transferReqId = order.transferRequest?.id;
        // Return buyers to the same page they started renewal from so we can
        // show a contextual popup (success or failed) with fresh data.
        const renewFailBase = order.includesDojoRenewal
            ? `${appUrl}/portal/dojo/renewals?status=failed&orderId=${orderId}`
            : order.includesPastBeltFee
                ? `${appUrl}/portal/joining?status=failed&orderId=${orderId}`
                : order.includesMembership
                    ? `${appUrl}/portal/renew?status=failed&orderId=${orderId}`
                    : null;
        const failUrl = order.includesTransferRequest && transferReqId
            ? `${appUrl}/portal/transfer/failed?requestId=${transferReqId}`
            : renewFailBase ?? `${appUrl}/portal/payment-failed?orderId=${orderId}`;
        const cancelUrl = order.includesTransferRequest && transferReqId
            ? `${appUrl}/portal/transfer/failed?requestId=${transferReqId}`
            : renewFailBase
                ? `${renewFailBase}&reason=${encodeURIComponent("You cancelled the payment before it was completed.")}`
                : `${appUrl}/portal/payment-failed?orderId=${orderId}&cancelled=1`;
        const productName = order.includesTransferRequest
            ? "JKA Dojo Transfer Fee"
            : order.includesMembership
                ? "JKA Membership + Gear"
                : "JKA Shop Order";

        const params = new URLSearchParams({
            store_id: storeId,
            store_passwd: storePassword!,
            total_amount: String(Number(order.total).toFixed(2)),
            currency: "BDT",
            tran_id: order.id,
            success_url: `${appUrl}/api/webhooks/sslcommerz/success?orderId=${orderId}`,
            fail_url: failUrl,
            cancel_url: cancelUrl,
            ipn_url: `${appUrl}/api/webhooks/sslcommerz`,
            cus_name: order.user.fullName,
            cus_email: order.user.email,
            cus_phone: order.user.phone ?? "01XXXXXXXXX",
            cus_add1: order.user.profile?.address ?? "Bangladesh",
            cus_city: "Dhaka",
            cus_postcode: "1000",
            cus_country: "Bangladesh",
            shipping_method: "NO",
            ship_name: order.user.fullName,
            ship_add1: order.user.profile?.address ?? "Bangladesh",
            ship_city: "Dhaka",
            ship_postcode: "1000",
            ship_country: "Bangladesh",
            product_name: productName,
            product_category: order.includesTransferRequest ? "Service" : "Membership",
            product_profile: "non-physical-goods",
            num_of_item: String(order.orderItems.length + (order.includesMembership ? 1 : 0) + (order.includesTransferRequest ? 1 : 0)),
        });

        const res = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const json = await res.json();

        if (json.status === "SUCCESS" && json.GatewayPageURL) {
            redirect(json.GatewayPageURL);
        }

        return { error: json.failedreason ?? "Payment gateway error. Please try again." };
    } catch (err: any) {
        // redirect() throws — rethrow it
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        return { error: err?.message ?? "Payment initiation failed." };
    }
}

// ─── Mark order paid (called from SSLCommerz success webhook / dev bypass) ───

export async function markOrderPaidAction(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    try {
        const order = await prisma.shopOrder.findUnique({
            where: { id: orderId, userId: user.id },
        });
        if (!order) return { error: "Order not found." };

        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);

        // Advance the joining flow only when it's the first JKA payment.
        const existing = await prisma.student.findUnique({
            where: { id: user.id },
            select: { joinStage: true },
        });
        const advanceJoin = existing?.joinStage === "FEE_UNPAID";

        await prisma.$transaction([
            prisma.shopOrder.update({
                where: { id: orderId },
                data: { paymentStatus: "PAID" },
            }),
            prisma.student.update({
                where: { id: user.id },
                data: {
                    membershipStatus: "ACTIVE",
                    onboardingComplete: true,
                    expiryDate: expiry,
                    ...(advanceJoin ? { joinStage: "AWAITING_APPROVAL" as const } : {}),
                },
            }),
        ]);

        return { success: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed." };
    }
}
