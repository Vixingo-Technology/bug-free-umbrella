import type { Metadata } from "next";
import Link from "next/link";
import { Award, AlertTriangle } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import RequestCertificatesPanel from "@/components/dojo/certificates/request-panel";
import RequestHistoryList from "@/components/dojo/certificates/request-history";
import CertificatePaymentPopup, {
    type CertificatePaymentFeedback,
} from "@/components/dojo/certificates/payment-popup";
import { getDojoSession, requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { SKIP_CERTIFICATE_PAYMENT } from "@/lib/certificates/config";
import { notifyAdmins } from "@/lib/notify";

export const metadata: Metadata = {
    title: "Certificates — Dojo Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Dev bypass: mark a pending certificate order PAID, advance its gradings to
 * the SUBMITTED pipeline stage, and notify admins. Mirrors the SSLCommerz
 * success webhook — PDF generation waits for JKA admin approval.
 */
async function submitOrderInline(orderId: string, userId: string) {
    const order = await prisma.shopOrder.findUnique({
        where: { id: orderId, userId },
        select: {
            paymentStatus: true,
            includesCertificates: true,
            certificateRequests: {
                select: {
                    id: true,
                    gradingId: true,
                    dojoId: true,
                    dojo: { select: { name: true } },
                },
            },
        },
    });
    if (!order?.includesCertificates || order.paymentStatus === "PAID") return 0;

    await prisma.$transaction([
        prisma.shopOrder.update({
            where: { id: orderId },
            data: { paymentStatus: "PAID" },
        }),
        prisma.certificateRequest.updateMany({
            where: { orderId, status: "PENDING_PAYMENT" },
            data: { status: "PAID" },
        }),
        prisma.grading.updateMany({
            where: {
                id: { in: order.certificateRequests.map((r) => r.gradingId) },
            },
            data: {
                pipelineStage: "SUBMITTED",
                submittedAt: new Date(),
            },
        }),
    ]);

    const dojoName = order.certificateRequests[0]?.dojo?.name ?? "A dojo";
    await notifyAdmins({
        title: "New certificate request",
        message: `${dojoName} submitted ${order.certificateRequests.length} certificate request${order.certificateRequests.length === 1 ? "" : "s"} for JKA HQ approval.`,
        type: "PAYMENT",
        link: "/portal/admin/certificates",
    });

    return order.certificateRequests.length;
}

export default async function DojoCertificatesPage({
    searchParams,
}: {
    searchParams: Promise<{
        issued?: string;
        status?: string;
        orderId?: string;
        reason?: string;
        dev?: string;
    }>;
}) {
    const { issued, status, orderId, reason, dev } = await searchParams;

    // Post-payment landings are middleware-whitelisted so the buyer sees the
    // popup even when the SSLCommerz cross-site redirect drops the auth
    // cookie. In that case we render a minimal popup-only shell and prompt a
    // re-login; otherwise fall through to the normal role gate.
    const maybeSession = await getDojoSession();
    const isPostPaymentLanding = status === "success" || status === "failed";
    if (!maybeSession && isPostPaymentLanding) {
        return (
            <CertificatePaymentPopup
                feedback={
                    status === "success"
                        ? { kind: "success", submittedCount: Number(issued) || 0 }
                        : {
                              kind: "failed",
                              reason:
                                  reason ??
                                  "The payment gateway declined the transaction. No certificates were issued.",
                              orderId: orderId ?? null,
                          }
                }
            />
        );
    }

    const session = maybeSession ?? (await requireDojoRole("DOJO_OWNER"));

    // Dev bypass — no gateway configured. Mirrors the SSLCommerz success
    // webhook: mark the order paid, advance gradings to SUBMITTED, notify
    // admins. Certificates are minted only once an admin approves them.
    let devSubmittedCount = 0;
    if (dev === "1" && orderId && status === "success") {
        try {
            devSubmittedCount = await submitOrderInline(orderId, session.userId);
        } catch (err) {
            console.error("[certificates] dev bypass failed", err);
        }
    }

    const parsedIssued = Number(issued);
    const submittedCount =
        devSubmittedCount ||
        (Number.isFinite(parsedIssued) && parsedIssued > 0 ? parsedIssued : 0);

    const feedback: CertificatePaymentFeedback =
        status === "success"
            ? { kind: "success", submittedCount }
            : status === "failed"
                ? {
                      kind: "failed",
                      reason:
                          reason ??
                          "The payment gateway declined the transaction. No certificates were issued.",
                      orderId: orderId ?? null,
                  }
                : null;

    if (!session.dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Certificates"
                    title="Certificates"
                    description="Approval required."
                />
                <div className="bg-amber-50 border border-amber-200 rounded-sm p-6 text-sm text-amber-800">
                    Certificate requests become available once your dojo is
                    approved by the federation.
                </div>
            </>
        );
    }

    const dojoId = session.dojo.id;
    const [dojo, eligibleGradings, history] = await Promise.all([
        prisma.dojo.findUnique({
            where: { id: dojoId },
            select: { ownerSignatureUrl: true, name: true },
        }),
        prisma.grading.findMany({
            where: {
                result: "PASSED",
                // Only students the Manager has verified are eligible to be
                // submitted to JKA HQ. Rows advance to SUBMITTED after payment
                // clears in the SSLCommerz webhook.
                pipelineStage: "VERIFIED",
                student: { dojoId },
                // A grading is off the eligible list only once its request
                // has actually been paid for. PENDING_PAYMENT rows are stale
                // attempts (payment failed or abandoned) — the request panel
                // supersedes them when a new order is placed.
                certificateRequests: {
                    none: {
                        status: {
                            in: ["PAID", "GENERATING", "ISSUED"],
                        },
                    },
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        user: { select: { fullName: true, memberNumber: true, profile: { select: { fatherName: true, motherName: true } } } },
                    },
                },
                toRank: {
                    select: {
                        name: true,
                        kyuDan: true,
                        colorHex: true,
                        certificatePrice: true,
                    },
                },
                gradingEvent: { select: { name: true, eventDate: true } },
            },
            orderBy: { createdAt: "desc" },
        }).then((rows) => rows.map((g) => ({
            ...g,
            member: {
                id: g.student.id,
                fullName: g.student.user.fullName,
                memberNumber: g.student.user.memberNumber,
                fatherName: g.student.user.profile?.fatherName ?? null,
                motherName: g.student.user.profile?.motherName ?? null,
            },
        }))),
        prisma.certificateRequest.findMany({
            where: {
                dojoId,
                // Only surface requests whose payment has cleared. Unpaid
                // requests live on the order in checkout; showing them here
                // would imply they've been submitted to JKA HQ.
                status: { in: ["PAID", "GENERATING", "ISSUED", "FAILED"] },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                student: { select: { id: true, user: { select: { fullName: true, memberNumber: true } } } },
            },
        }).then((rows) => rows.map((r) => ({
            ...r,
            member: { id: r.student.id, fullName: r.student.user.fullName, memberNumber: r.student.user.memberNumber },
        }))),
    ]);

    const missingSignature = !dojo?.ownerSignatureUrl;

    return (
        <>
            <DojoPageHeader
                eyebrow="Certificates"
                title="Certificates"
                description={`Request printed certificates for students who have passed a grading at ${session.dojo.name}.`}
                actions={
                    <Link
                        href="/portal/dojo/settings#signature"
                        className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                    >
                        Manage owner signature
                    </Link>
                }
            />

            <CertificatePaymentPopup feedback={feedback} />

            {missingSignature && (
                <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-start gap-3 mb-6">
                    <AlertTriangle
                        size={16}
                        className="text-amber-500 mt-0.5 shrink-0"
                    />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">
                            Owner signature required
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Upload your signature on{" "}
                            <Link
                                href="/portal/dojo/settings#signature"
                                className="underline font-semibold"
                            >
                                Dojo settings
                            </Link>{" "}
                            before placing a certificate order.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-6">
                <RequestCertificatesPanel
                    items={serialize(eligibleGradings) as never}
                    disabled={missingSignature}
                    skipPayment={SKIP_CERTIFICATE_PAYMENT}
                />

                <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <header className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
                        <Award size={14} className="text-accent-red" />
                        <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                            Recent certificate orders
                        </h3>
                    </header>
                    <RequestHistoryList
                        requests={serialize(history) as never}
                    />
                </section>
            </div>
        </>
    );
}
