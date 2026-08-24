import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitPaymentSuccess } from "@/lib/n8n";
import type { Prisma } from "@/prisma/generated/client";
import { notifyAdmins, notifyMembers } from "@/lib/notify";
import { findUserIdsByRoles } from "@/lib/notify/recipients";
import { extendExpiry } from "@/lib/renewals/extend-expiry";
import { kindForOrder, recordPaymentOutcome } from "@/lib/payments/log";
import { formatDateLong } from "@/lib/format/datetime";
import { formatBeltRank } from "@/lib/constants";

// Landing pages for the buyer after we finish server-side processing. We
// prefer the page the buyer came from (renew form, dojo renewal card) so
// they see a contextual popup instead of a generic confirmation screen.
function successRedirectFor(order: {
    includesMembership: boolean;
    includesDojoRenewal: boolean;
    includesTransferRequest: boolean;
    includesPastBeltFee: boolean;
    includesCertificates: boolean;
    includesServiceRequest: boolean;
    serviceSlug: string | null;
    joinAdvanceForFeeUnpaid: boolean;
}, orderId: string, expiryIso: string | null): string {
    if (order.includesServiceRequest && order.serviceSlug) {
        return `/portal/services/${order.serviceSlug}?status=success&orderId=${orderId}`;
    }
    if (order.includesCertificates) {
        return `/portal/dojo/certificates?status=success&orderId=${orderId}`;
    }
    if (order.includesDojoRenewal) {
        const params = new URLSearchParams({
            status: "success",
            orderId,
            ...(expiryIso ? { expiry: expiryIso } : {}),
        });
        return `/portal/dojo/renewals?${params.toString()}`;
    }
    if (order.includesPastBeltFee) {
        return `/portal/joining?status=success&orderId=${orderId}`;
    }
    // First JKA fee lands on the joining page to continue the flow.
    if (order.joinAdvanceForFeeUnpaid) {
        return `/portal/joining?status=success&orderId=${orderId}`;
    }
    if (order.includesMembership) {
        const params = new URLSearchParams({
            status: "success",
            orderId,
            ...(expiryIso ? { expiry: expiryIso } : {}),
        });
        return `/portal/renew?${params.toString()}`;
    }
    return `/portal/payment-success?orderId=${orderId}`;
}

function failureRedirectFor(order: {
    includesMembership: boolean;
    includesDojoRenewal: boolean;
    includesTransferRequest: boolean;
    includesPastBeltFee: boolean;
    includesCertificates: boolean;
    includesServiceRequest: boolean;
    serviceSlug: string | null;
} | null, orderId: string, reason: string): string {
    const reasonParam = encodeURIComponent(reason);
    if (order?.includesServiceRequest && order.serviceSlug) {
        return `/portal/services/${order.serviceSlug}?status=failed&orderId=${orderId}&reason=${reasonParam}`;
    }
    if (order?.includesCertificates) {
        return `/portal/dojo/certificates?status=failed&orderId=${orderId}&reason=${reasonParam}`;
    }
    if (order?.includesDojoRenewal) {
        return `/portal/dojo/renewals?status=failed&orderId=${orderId}&reason=${reasonParam}`;
    }
    if (order?.includesPastBeltFee) {
        return `/portal/joining?status=failed&orderId=${orderId}&reason=${reasonParam}`;
    }
    if (order?.includesMembership) {
        return `/portal/renew?status=failed&orderId=${orderId}&reason=${reasonParam}`;
    }
    return `/portal/payment-failed?orderId=${orderId}&reason=${reasonParam}`;
}

/**
 * Mark every still-unpaid certificate request on the order as PAID, advance
 * the linked gradings to the SUBMITTED pipeline stage, and notify the JKA
 * admins that a new certificate request is waiting for approval.
 *
 * PDF generation is intentionally NOT triggered here — an admin must first
 * approve the request from /portal/admin/certificates, which is what actually
 * renders and uploads the PDF.
 */
async function submitCertificatesForOrder(orderId: string, requestIds: string[]) {
    await prisma.certificateRequest.updateMany({
        where: { orderId, status: "PENDING_PAYMENT" },
        data: { status: "PAID" },
    });

    // Pull the requests + their dojo/member context for the admin notification
    // and the pipeline-stage bump. Only paid rows count.
    const paid = await prisma.certificateRequest.findMany({
        where: { id: { in: requestIds }, status: "PAID" },
        select: { id: true, gradingId: true, dojoId: true, memberName: true, dojo: { select: { name: true } } },
    });

    if (paid.length === 0) return;

    await prisma.grading.updateMany({
        where: { id: { in: paid.map((r) => r.gradingId) } },
        data: {
            pipelineStage: "SUBMITTED",
            submittedAt: new Date(),
        },
    });

    // Group by dojo for a tidy admin notification.
    const byDojo = new Map<string, { dojoName: string; count: number }>();
    for (const r of paid) {
        const key = r.dojoId;
        const bucket = byDojo.get(key) ?? { dojoName: r.dojo?.name ?? "A dojo", count: 0 };
        bucket.count += 1;
        byDojo.set(key, bucket);
    }
    for (const { dojoName, count } of byDojo.values()) {
        await notifyAdmins({
            title: "New certificate request",
            message: `${dojoName} submitted ${count} certificate request${count === 1 ? "" : "s"} for JKA HQ approval.`,
            type: "PAYMENT",
            link: "/portal/admin/certificates",
        });
    }
}

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
            return NextResponse.redirect(
                new URL(`/portal/payment-success?orderId=${orderId}`, request.url),
                303,
            );
        }

        // Validate IPN
        const validateUrl = `https://${isSandbox ? "sandbox" : "securepay"}.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
        const validation = await fetch(validateUrl);
        const json = await validation.json();

        // Grab a lightweight copy of the order so we know where to send the
        // buyer on failure (renew page vs generic).
        const orderShell = await prisma.shopOrder.findUnique({
            where: { id: orderId },
            select: {
                includesMembership: true,
                includesDojoRenewal: true,
                includesTransferRequest: true,
                includesPastBeltFee: true,
                includesCertificates: true,
                includesServiceRequest: true,
                serviceRequest: { select: { service: { select: { slug: true } } } },
            },
        });
        const orderShellRedirect = orderShell
            ? { ...orderShell, serviceSlug: orderShell.serviceRequest?.service.slug ?? null }
            : null;

        if (json.status !== "VALID" && json.status !== "VALIDATED") {
            const reason =
                json.failedreason ||
                "The payment gateway declined the transaction.";
            await recordPaymentOutcome({
                orderId,
                status: "FAILED",
                gatewayTxnId: valId,
                reason,
            });
            return NextResponse.redirect(
                new URL(
                    failureRedirectFor(orderShellRedirect, orderId, reason),
                    request.url,
                ),
                303,
            );
        }

        // Mark order paid + activate membership (member and/or dojo)
        const order = await prisma.shopOrder.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, fullName: true, email: true, phone: true } },
                dojo: { select: { expiryDate: true } },
                transferRequest: { select: { id: true, studentId: true, fromDojoId: true, toDojo: { select: { name: true } }, fromDojo: { select: { name: true } } } },
                serviceRequest: { select: { id: true, studentId: true, dojoId: true, service: { select: { name: true, slug: true } } } },
                certificateRequests: { select: { id: true } },
                orderItems: { select: { id: true } },
            },
        });

        if (order) {
            await recordPaymentOutcome({
                orderId,
                status: "SUCCESS",
                gatewayTxnId: valId,
                kind: kindForOrder(order),
                amount: Number(order.total),
                currency: order.currency,
                buyer: order.user
                    ? {
                          userId: order.user.id,
                          name: order.user.fullName,
                          email: order.user.email,
                          phone: order.user.phone,
                      }
                    : undefined,
            });
        }
        let renewedExpiryIso: string | null = null;
        let joinAdvanceForFeeUnpaid = false;
        if (order && order.paymentStatus !== "PAID" && order.userId) {
            const writes: Prisma.PrismaPromise<unknown>[] = [
                prisma.shopOrder.update({
                    where: { id: orderId },
                    data: { paymentStatus: "PAID", transactionId: valId },
                }),
            ];

            // Member-level renewal (onboarding fee or /portal/renew) — extends
            // the buyer's own membership. Membership lives on Student now.
            //
            // The very first JKA payment also moves the joining flow from
            // FEE_UNPAID → AWAITING_APPROVAL so the dojo owner can accept the
            // student and confirm their rank. Later renewals leave joinStage
            // untouched (already JOINED for existing members).
            let memberExpiry: Date | null = null;
            if (order.includesMembership) {
                const existing = await prisma.student.findUnique({
                    where: { id: order.userId },
                    select: { expiryDate: true, joinStage: true },
                });
                memberExpiry = extendExpiry(existing?.expiryDate ?? null);
                joinAdvanceForFeeUnpaid = existing?.joinStage === "FEE_UNPAID";
                writes.push(
                    prisma.student.update({
                        where: { id: order.userId },
                        data: {
                            membershipStatus: "ACTIVE",
                            onboardingComplete: true,
                            expiryDate: memberExpiry,
                            ...(joinAdvanceForFeeUnpaid
                                ? { joinStage: "AWAITING_APPROVAL" as const }
                                : {}),
                        },
                    }),
                );
            }

            // Dojo-level renewal — extends the dojo's federation membership.
            // Also re-activates the owner's account so lapsed dojos get their
            // dashboard back the moment the fee lands.
            let dojoExpiry: Date | null = null;
            if (order.includesDojoRenewal && order.dojoId) {
                dojoExpiry = extendExpiry(order.dojo?.expiryDate ?? null);
                writes.push(
                    prisma.dojo.update({
                        where: { id: order.dojoId },
                        data: { expiryDate: dojoExpiry, isActive: true },
                    }),
                );
                writes.push(
                    prisma.user.update({
                        where: { id: order.userId },
                        data: { isActive: true },
                    }),
                );
            }

            renewedExpiryIso =
                (dojoExpiry ?? memberExpiry)?.toISOString() ?? null;

            // Past-belt catch-up fee — finalize the joining flow.
            // Student's rank was already set at approval time; this payment
            // just unlocks JOINED. Sending the completion notifications
            // happens after $transaction commits, below.
            let pastBeltFinalizedForUser: string | null = null;
            if (order.includesPastBeltFee) {
                const existing = await prisma.student.findUnique({
                    where: { id: order.userId },
                    select: { assignedRank: true, joinStage: true, dojoId: true },
                });
                if (existing?.joinStage === "PAST_BELT_UNPAID") {
                    writes.push(
                        prisma.student.update({
                            where: { id: order.userId },
                            data: {
                                joinStage: "JOINED",
                                joinedAt: new Date(),
                                currentRank: existing.assignedRank ?? undefined,
                            },
                        }),
                    );
                    pastBeltFinalizedForUser = order.userId;
                }
            }

            // Transfer request fee — move the linked request to AWAITING_DOJO.
            if (order.includesTransferRequest && order.transferRequest) {
                writes.push(
                    prisma.studentTransferRequest.update({
                        where: { id: order.transferRequest.id },
                        data: {
                            status: "AWAITING_DOJO",
                            paidAt: new Date(),
                        },
                    }),
                );
            }

            // Generic service request fee — move the linked request to AWAITING_DOJO.
            if (order.includesServiceRequest && order.serviceRequest) {
                writes.push(
                    prisma.serviceRequest.update({
                        where: { id: order.serviceRequest.id },
                        data: {
                            status: "AWAITING_DOJO",
                            paidAt: new Date(),
                        },
                    }),
                );
            }

            await prisma.$transaction(writes);

            // Certificates — flip the requests to PAID, move each grading to
            // the SUBMITTED pipeline stage, and notify JKA admins that a new
            // certificate request needs approval. PDF generation now waits
            // for that admin approval.
            if (order.includesCertificates && order.certificateRequests.length > 0) {
                await submitCertificatesForOrder(
                    order.id,
                    order.certificateRequests.map((r) => r.id),
                );
            }

            // Joining-flow — first JKA payment: alert the assigned dojo owner
            // (if any) that a new student is waiting for approval.
            if (joinAdvanceForFeeUnpaid) {
                const stu = await prisma.student.findUnique({
                    where: { id: order.userId },
                    select: {
                        dojoId: true,
                        requestedRank: true,
                        user: { select: { fullName: true } },
                    },
                });
                await notifyMembers([order.userId], {
                    title: "Membership fee received",
                    message:
                        "Great — your JKA membership fee is confirmed. Please download your joining slip and visit your dojo with the required documents.",
                    type: "PAYMENT",
                    link: "/portal/joining",
                });
                if (stu?.dojoId) {
                    const ownerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: stu.dojoId });
                    await notifyMembers(ownerIds, {
                        title: "New join request",
                        message: `${stu.user?.fullName ?? "A new student"} has paid the JKA fee and requested to join your dojo (requested rank: ${formatBeltRank(stu.requestedRank ?? "White Belt")}). Please review and confirm their rank.`,
                        type: "INFO",
                        link: "/portal/dojo/join-requests",
                    });
                }
            }

            // Joining-flow — past-belt payment: both parties get "Student joined".
            if (pastBeltFinalizedForUser) {
                const stu = await prisma.student.findUnique({
                    where: { id: pastBeltFinalizedForUser },
                    select: {
                        dojoId: true,
                        assignedRank: true,
                        user: { select: { fullName: true } },
                    },
                });
                await notifyMembers([pastBeltFinalizedForUser], {
                    title: "You've joined JKA Bangladesh",
                    message: `Welcome! Your rank is set to ${formatBeltRank(stu?.assignedRank ?? "White Belt")} and your dojo has confirmed you. Full portal access is unlocked.`,
                    type: "INFO",
                    link: "/portal",
                });
                if (stu?.dojoId) {
                    const ownerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: stu.dojoId });
                    await notifyMembers(ownerIds, {
                        title: "Student joined successfully",
                        message: `${stu.user?.fullName ?? "A new student"} has completed joining at ${formatBeltRank(stu.assignedRank ?? "White Belt")}.`,
                        type: "INFO",
                        link: "/portal/dojo/join-requests",
                    });
                }
            }

            // Service request — notify dojo staff + confirm to student.
            if (order.includesServiceRequest && order.serviceRequest) {
                const staffIds = await findUserIdsByRoles(
                    ["DOJO_OWNER", "DOJO_MANAGER"],
                    { dojoId: order.serviceRequest.dojoId },
                );
                if (staffIds.length) {
                    await notifyMembers(staffIds, {
                        title: `${order.serviceRequest.service.name} — new request`,
                        message: "A student in your dojo submitted a paid service request. Please review.",
                        type: "SERVICE",
                        link: "/portal/dojo/service-requests",
                    });
                }
                await notifyMembers([order.serviceRequest.studentId], {
                    title: `${order.serviceRequest.service.name} — payment received`,
                    message: `Payment of ৳${Number(order.total).toLocaleString()} received. Awaiting your dojo's review.`,
                    type: "PAYMENT",
                    link: `/portal/services/${order.serviceRequest.service.slug}`,
                });
            }

            // Notify current dojo owner + student now that the request is live.
            if (order.includesTransferRequest && order.transferRequest) {
                const ownerIds = await findUserIdsByRoles(["DOJO_OWNER"], { dojoId: order.transferRequest.fromDojoId });
                await notifyMembers(ownerIds, {
                    title: "Transfer request pending your clearance",
                    message: `A student has requested a transfer from ${order.transferRequest.fromDojo?.name ?? "your dojo"} to ${order.transferRequest.toDojo?.name ?? "another dojo"}.`,
                    type: "TRANSFER",
                    link: "/portal/dojo/transfers",
                });
                await notifyMembers([order.transferRequest.studentId], {
                    title: "Transfer payment received",
                    message: `Your ৳${Number(order.total).toLocaleString()} transfer fee was received. Awaiting clearance from your current dojo.`,
                    type: "PAYMENT",
                    link: "/portal/transfer",
                });
            }
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
                    membershipExpiresAt: renewedExpiryIso ?? undefined,
                });

                // In-app receipt for the buyer.
                const receiptLink = order.includesCertificates
                    ? "/portal/dojo/certificates"
                    : order.includesDojoRenewal
                        ? "/portal/dojo/renewals"
                        : order.includesMembership
                            ? "/portal/renew"
                            : "/portal/orders";
                await notifyMembers([updatedUser.id], {
                    title: order.includesCertificates
                        ? "Certificate request submitted"
                        : order.includesDojoRenewal
                            ? "Dojo membership renewed"
                            : order.includesMembership
                                ? "Membership renewed"
                                : "Payment received",
                    message: renewedExpiryIso
                        ? `Payment of ${order.currency} ${Number(order.total).toLocaleString()} received. Valid until ${formatDateLong(renewedExpiryIso)}.`
                        : `Your payment of ${order.currency} ${Number(order.total).toLocaleString()} was successful. Thank you!`,
                    type: "PAYMENT",
                    link: receiptLink,
                });

                // Back-office heads-up.
                await notifyAdmins({
                    title: "New paid order",
                    message: `${updatedUser.fullName} paid ${order.currency} ${Number(order.total).toLocaleString()}${order.includesMembership ? " (incl. membership)" : ""}${order.includesDojoRenewal ? " (incl. dojo renewal)" : ""}.`,
                    type: "PAYMENT",
                    link: "/portal/admin/orders",
                });
            }
        }

        const target = successRedirectFor(
            {
                includesMembership: order?.includesMembership ?? false,
                includesDojoRenewal: order?.includesDojoRenewal ?? false,
                includesTransferRequest: order?.includesTransferRequest ?? false,
                includesPastBeltFee: order?.includesPastBeltFee ?? false,
                includesCertificates: order?.includesCertificates ?? false,
                includesServiceRequest: order?.includesServiceRequest ?? false,
                serviceSlug: order?.serviceRequest?.service.slug ?? null,
                joinAdvanceForFeeUnpaid,
            },
            orderId,
            renewedExpiryIso,
        );
        return NextResponse.redirect(new URL(target, request.url), 303);
    } catch (err) {
        console.error("SSLCommerz success webhook error:", err);
        return NextResponse.redirect(new URL("/portal", request.url), 303);
    }
}

// Dev bypass — GET from dev redirect
export async function GET(request: Request) {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return NextResponse.redirect(new URL("/portal", request.url));
    return NextResponse.redirect(new URL(`/portal/payment-success?orderId=${orderId}`, request.url));
}
