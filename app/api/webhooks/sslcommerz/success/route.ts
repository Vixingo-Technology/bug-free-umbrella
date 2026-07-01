import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitPaymentSuccess } from "@/lib/n8n";
import type { Prisma } from "@/prisma/generated/client";
import { notifyAdmins, notifyMembers } from "@/lib/notify";

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
            // the buyer's own membership. Membership lives on Student now.
            if (order.includesMembership) {
                writes.push(
                    prisma.student.update({
                        where: { id: order.userId },
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

            await prisma.$transaction(writes);
            const updatedUser = await prisma.user.findUnique({
                where: { id: order.userId },
                select: { id: true, fullName: true, email: true },
            });

            if (updatedUser) {
                // Fire-and-forget n8n webhook (email + WhatsApp confirmation)
                await emitPaymentSuccess({
                    memberId: updatedUser.id,
                    memberFullName: updatedUser.fullName,
                    memberEmail: updatedUser.email,
                    orderId,
                    total: Number(order.total),
                    currency: order.currency,
                    includesMembership:
                        order.includesMembership || order.includesDojoRenewal,
                    membershipExpiresAt: expiry.toISOString(),
                });

                // In-app receipt for the buyer.
                await notifyMembers([updatedUser.id], {
                    title: "Payment received",
                    message: `Your payment of ${order.currency} ${Number(order.total).toLocaleString()} was successful. Thank you!`,
                    type: "PAYMENT",
                    link: "/portal/orders",
                });

                // Back-office heads-up.
                await notifyAdmins({
                    title: "New paid order",
                    message: `${updatedUser.fullName} paid ${order.currency} ${Number(order.total).toLocaleString()}${order.includesMembership ? " (incl. membership)" : ""}.`,
                    type: "PAYMENT",
                    link: "/portal/admin/orders",
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
