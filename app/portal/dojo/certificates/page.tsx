import type { Metadata } from "next";
import Link from "next/link";
import { Award, AlertTriangle, CheckCircle2 } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import RequestCertificatesPanel from "@/components/dojo/certificates/request-panel";
import RequestHistoryList from "@/components/dojo/certificates/request-history";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { SKIP_CERTIFICATE_PAYMENT } from "@/lib/certificates/config";

export const metadata: Metadata = {
    title: "Certificates — Dojo Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DojoCertificatesPage({
    searchParams,
}: {
    searchParams: Promise<{ issued?: string }>;
}) {
    const { issued } = await searchParams;
    const issuedCount = Number(issued);
    const showIssuedBanner =
        Number.isFinite(issuedCount) && issuedCount > 0;
    const session = await requireDojoRole("DOJO_MANAGER");

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
                student: { dojoId },
                certificateRequests: {
                    none: {
                        status: {
                            in: ["PENDING_PAYMENT", "PAID", "GENERATING", "ISSUED"],
                        },
                    },
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        memberNumber: true,
                        fatherName: true,
                        motherName: true,
                        user: { select: { fullName: true } },
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
                memberNumber: g.student.memberNumber,
                fatherName: g.student.fatherName,
                motherName: g.student.motherName,
            },
        }))),
        prisma.certificateRequest.findMany({
            where: { dojoId },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                student: { select: { id: true, memberNumber: true, user: { select: { fullName: true } } } },
            },
        }).then((rows) => rows.map((r) => ({
            ...r,
            member: { id: r.student.id, fullName: r.student.user.fullName, memberNumber: r.student.memberNumber },
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

            {showIssuedBanner && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 flex items-start gap-3 mb-6">
                    <CheckCircle2
                        size={16}
                        className="text-emerald-500 mt-0.5 shrink-0"
                    />
                    <div>
                        <p className="text-sm font-semibold text-emerald-900">
                            {issuedCount} certificate
                            {issuedCount === 1 ? "" : "s"} generated
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            PDFs are now available on each student&apos;s
                            profile and listed below.
                        </p>
                    </div>
                </div>
            )}

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
