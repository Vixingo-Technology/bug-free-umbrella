import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitPaymentSuccess } from "@/lib/n8n";
import type { Prisma } from "@/prisma/generated/client";

// Called by SSLCommerz after successful payment (success_url).
// SSLCommerz POSTs form data here; we validate, mark order paid, redirect.

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const valId = formData.get("val_id") as string;
        const tranId = formData.get("tran_id") as string; // = our order ID
        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId") ?? tranId;

        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

        if (!storeId || !storePassword) {
            return NextResponse.redirect(new URL(`/portal/payment-success?orderId=${orderId}`, request.url));
        }

        // Validate IPN
        const validateUrl = `https://${isSandbox ? "sandbox" : "securepay"}.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
        const validation = await fetch(validateUrl);
        const json = await validation.json();

        if (json.status !== "VALID" && json.status !== "VALIDATED") {
            return NextResponse.redirect(new URL(`/portal/checkout?orderId=${orderId}&failed=1`, request.url));
        }

        // Mark order paid + activate membership (member and/or dojo)
        const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
        if (order && order.paymentStatus !== "PAID") {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);

            const writes: Prisma.PrismaPromise<unknown>[] = [
                prisma.shopOrder.update({
                    where: { id: orderId },
                    data: { paymentStatus: "PAID", transactionId: valId },
                }),
            ];

            // Member-level renewal (onboarding fee or /portal/renew) — extends
            // the buyer's own membership.
            if (order.includesMembership) {
                writes.push(
                    prisma.member.update({
                        where: { id: order.memberId },
                        data: {
                            membershipStatus: "ACTIVE",
                            onboardingComplete: true,
                            expiryDate: expiry,
                        },
                    }),
                );
            }

            // Dojo-level renewal — extends the dojo's federation membership.
            if (order.includesDojoRenewal && order.dojoId) {
                writes.push(
                    prisma.dojo.update({
                        where: { id: order.dojoId },
                        data: { expiryDate: expiry, isActive: true },
                    }),
                );
            }

            const results = await prisma.$transaction(writes);
            const updatedMember = order.includesMembership
                ? (results[1] as Awaited<ReturnType<typeof prisma.member.update>>)
                : await prisma.member.findUnique({ where: { id: order.memberId } });

            if (updatedMember) {
                // Fire-and-forget n8n webhook (email + WhatsApp confirmation)
                await emitPaymentSuccess({
                    memberId: updatedMember.id,
                    memberFullName: updatedMember.fullName,
                    memberEmail: updatedMember.email,
                    orderId,
                    total: Number(order.total),
                    currency: order.currency,
                    includesMembership:
                        order.includesMembership || order.includesDojoRenewal,
                    membershipExpiresAt: expiry.toISOString(),
                });
            }
        }

        return NextResponse.redirect(new URL(`/portal/payment-success?orderId=${orderId}`, request.url));
    } catch (err) {
        console.error("SSLCommerz success webhook error:", err);
        return NextResponse.redirect(new URL("/portal", request.url));
    }
}

// Dev bypass — GET from dev redirect
export async function GET(request: Request) {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return NextResponse.redirect(new URL("/portal", request.url));
    return NextResponse.redirect(new URL(`/portal/payment-success?orderId=${orderId}`, request.url));
}
