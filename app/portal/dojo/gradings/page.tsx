import type { Metadata } from "next";
import Link from "next/link";
import { Award, CheckCircle2, Clock, Download, Send, Sparkles } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import AppliedStage from "@/components/dojo/gradings/applied-stage";
import QualifiedStage, { type QualifiedPassed } from "@/components/dojo/gradings/qualified-stage";
import ScheduledList from "@/components/dojo/gradings/scheduled-list";
import PipelineTabs, { type PipelineTab } from "@/components/dojo/gradings/pipeline-tabs";
import { hasAtLeast, ROLE_LABEL } from "@/lib/dojo-roles";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Belt tests — Dojo Dashboard",
};

type Stage = "APPLIED" | "QUALIFIED" | "VERIFIED" | "SUBMITTED";

type Candidate = {
    id: string;
    name: string;
    currentRank: string;
    targetRank: string;
    appliedOn: string;
    stage: Stage;
    paymentStatus: "PAID" | "DUE" | "EXPIRED_MEMBERSHIP";
    note?: string;
    notes: string | null;
};

const SAMPLE: Candidate[] = [
    {
        id: "1",
        name: "Tahmid Rahman",
        currentRank: "8th Kyu · Yellow",
        targetRank: "7th Kyu · Orange",
        appliedOn: "Jun 18",
        stage: "APPLIED",
        paymentStatus: "PAID",
        notes: null,
    },
    {
        id: "2",
        name: "Anika Hossain",
        currentRank: "7th Kyu · Orange",
        targetRank: "6th Kyu · Green",
        appliedOn: "Jun 17",
        stage: "APPLIED",
        paymentStatus: "PAID",
        notes: null,
    },
    {
        id: "3",
        name: "Ibrahim Khan",
        currentRank: "5th Kyu · Purple",
        targetRank: "4th Kyu · Purple Stripe",
        appliedOn: "Jun 12",
        stage: "QUALIFIED",
        paymentStatus: "DUE",
        note: "Tested 22 Jun. Owes ৳ 1,200 in dues.",
        notes: null,
    },
    {
        id: "5",
        name: "Rahim Uddin",
        currentRank: "3rd Kyu · Brown",
        targetRank: "2nd Kyu · Brown Stripe",
        appliedOn: "Jun 05",
        stage: "VERIFIED",
        paymentStatus: "PAID",
        note: "Verified by Manager. Awaiting Dojo Head submission.",
        notes: null,
    },
];

export default async function GradingsPage() {
    const session = await requireDojoRole("INSTRUCTOR");
    const role = session.role;

    const [candidates, scheduledCount, qualifiedPassed, verifiedRows, submittedRows] = await Promise.all([
        session.dojo ? loadRealCandidates(session.dojo.id) : Promise.resolve(SAMPLE),
        session.dojo
            ? prisma.gradingEvent.count({
                  where: {
                      applications: {
                          some: { student: { dojoId: session.dojo.id } },
                      },
                  },
              })
            : Promise.resolve(0),
        session.dojo ? loadPipelineRows(session.dojo.id, "QUALIFIED") : Promise.resolve([]),
        session.dojo ? loadPipelineRows(session.dojo.id, "VERIFIED") : Promise.resolve([]),
        session.dojo ? loadPipelineRows(session.dojo.id, "SUBMITTED") : Promise.resolve([]),
    ]);

    const applied = candidates.filter((c) => c.stage === "APPLIED");

    const tabs: PipelineTab[] = [
        {
            key: "applied",
            label: "1 · Applied",
            count: applied.length,
            actor: "Instructor schedules the test.",
            body: (
                <AppliedStage
                    candidates={applied}
                    canSchedule={hasAtLeast(role, "INSTRUCTOR")}
                    dojoAddress={session.dojo?.address ?? null}
                />
            ),
        },
        {
            key: "scheduled",
            label: "2 · Scheduled tests",
            count: scheduledCount,
            actor: "Reschedule, draft results with marks, and publish.",
            body: session.dojo ? (
                <ScheduledList dojoId={session.dojo.id} />
            ) : (
                <Empty>Set up your dojo to see scheduled belt tests.</Empty>
            ),
        },
        {
            key: "qualified",
            label: "3 · Qualified",
            count: qualifiedPassed.length,
            actor: "Manager verifies dues, membership, and background — then sends to Verified.",
            body: (
                <QualifiedStage
                    rows={qualifiedPassed}
                    canVerify={hasAtLeast(role, "DOJO_MANAGER")}
                />
            ),
        },
        {
            key: "verified",
            label: "4 · Verified",
            count: verifiedRows.length,
            actor: "Dojo Head submits to JKA HQ to request certificates.",
            body:
                verifiedRows.length === 0 ? (
                    <Empty>No candidates ready to submit.</Empty>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200 pb-3">
                            <p className="text-xs text-zinc-500">
                                {verifiedRows.length} student
                                {verifiedRows.length === 1 ? "" : "s"} ready. Pick who to submit and request their certificates.
                            </p>
                            {hasAtLeast(role, "DOJO_OWNER") ? (
                                <Link
                                    href="/portal/dojo/certificates"
                                    className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm bg-accent-red text-white hover:bg-accent-red/90"
                                >
                                    <Send size={14} />
                                    Submit to JKA HQ
                                </Link>
                            ) : (
                                <RoleNote requires="Dojo Head" />
                            )}
                        </div>
                        <ul className="divide-y divide-zinc-200">
                            {verifiedRows.map((q) => (
                                <PipelineRow key={q.gradingId} q={q} />
                            ))}
                        </ul>
                    </div>
                ),
        },
        {
            key: "submitted",
            label: "5 · Submitted",
            count: submittedRows.length,
            actor: "Federation reviews the request and issues the certificate.",
            body:
                submittedRows.length === 0 ? (
                    <Empty>No outstanding federation submissions.</Empty>
                ) : (
                    <ul className="divide-y divide-zinc-200">
                        {submittedRows.map((q) => (
                            <PipelineRow key={q.gradingId} q={q}>
                                {q.certificateStatus === "ISSUED" && q.certificateUrl ? (
                                    <a
                                        href={q.certificateUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-sm"
                                    >
                                        <Download size={12} />
                                        Download certificate
                                    </a>
                                ) : q.certificateStatus === "ISSUED" ? (
                                    <span className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-emerald-700">
                                        <CheckCircle2 size={12} />
                                        Certificate issued
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                        <Clock size={12} />
                                        Submitted to JKA HQ
                                    </span>
                                )}
                            </PipelineRow>
                        ))}
                    </ul>
                ),
        },
    ];

    return (
        <>
            <DojoPageHeader
                eyebrow="Belt tests"
                title="Grading pipeline"
                description={`Track every candidate from application to JKA certificate. You're acting as ${ROLE_LABEL[role]}.`}
                actions={
                    <span className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                        {candidates.length} candidates in pipeline
                    </span>
                }
            />

            <PipelineTabs tabs={tabs} />
        </>
    );
}

async function loadPipelineRows(
    dojoId: string,
    stage: "QUALIFIED" | "VERIFIED" | "SUBMITTED"
): Promise<QualifiedPassed[]> {
    const rows = await prisma.grading.findMany({
        where: {
            result: "PASSED",
            pipelineStage: stage,
            student: { dojoId },
            gradingEvent: { resultsPublishedAt: { not: null } },
        },
        orderBy: { gradingEvent: { resultsPublishedAt: "desc" } },
        include: {
            student: { select: { id: true, user: { select: { fullName: true } } } },
            fromRank: { select: { name: true } },
            toRank: { select: { name: true } },
            gradingEvent: { select: { name: true, resultsPublishedAt: true } },
            // Latest cert request drives the Submitted-tab status pill.
            certificateRequests: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true, certificateUrl: true },
            },
        },
    });

    return rows.map((g) => {
        const cert = g.certificateRequests[0];
        return {
            gradingId: g.id,
            studentId: g.student.id,
            name: g.student.user.fullName,
            fromRank: g.fromRank?.name ?? null,
            toRank: g.toRank?.name ?? null,
            marks: g.marks,
            isDoublePromotion: g.isDoublePromotion,
            eventName: g.gradingEvent?.name ?? "",
            publishedOn:
                g.gradingEvent?.resultsPublishedAt?.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }) ?? "",
            certificateStatus: cert?.status ?? null,
            certificateUrl: cert?.certificateUrl ?? null,
        };
    });
}

function PipelineRow({
    q,
    children,
}: {
    q: QualifiedPassed;
    children?: React.ReactNode;
}) {
    return (
        <li className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-sm">
                    {q.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                </div>
                <div>
                    <Link
                        href={`/portal/dojo/members/${q.studentId}`}
                        className="font-semibold text-zinc-900 text-sm hover:text-accent-red hover:underline"
                    >
                        {q.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                        {q.fromRank ?? "—"} →{" "}
                        <span className="text-accent-red font-semibold">
                            {q.toRank ?? "—"}
                        </span>
                        {q.isDoublePromotion && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                <Sparkles size={10} /> Double promotion
                            </span>
                        )}
                    </p>
                    <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold mt-1">
                        {q.eventName} · Published {q.publishedOn}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className="inline-flex items-baseline gap-1 text-xs tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <span className="text-base leading-none font-black">
                        {q.marks ?? "—"}
                    </span>
                    <span className="text-[10px]">/ 100</span>
                </span>
                {children}
            </div>
        </li>
    );
}

async function loadRealCandidates(dojoId: string): Promise<Candidate[]> {
    // Only the "Applied" stage maps cleanly to the current schema. The
    // qualified/verified/submitted stages need a workflow table — until that
    // exists they read empty.
    const apps = await prisma.gradingApplication.findMany({
        where: {
            status: "SUBMITTED",
            student: { dojoId },
        },
        orderBy: { appliedAt: "desc" },
        include: {
            student: { select: { currentRank: true, user: { select: { fullName: true } } } },
            targetRank: { select: { name: true } },
        },
    });

    return apps.map((a) => ({
        id: a.id,
        name: a.student.user.fullName,
        currentRank: a.student.currentRank,
        targetRank: a.targetRank?.name ?? "—",
        appliedOn: a.appliedAt.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
        }),
        stage: "APPLIED" as const,
        paymentStatus: "PAID" as const,
        notes: a.notes,
    }));
}

function Btn({
    children,
    icon,
    variant = "primary",
    disabled,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    variant?: "primary" | "ghost";
    disabled?: boolean;
}) {
    const base =
        "inline-flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
    const cls =
        variant === "primary"
            ? "bg-accent-red text-white hover:bg-accent-red/90"
            : "border border-zinc-300 text-zinc-600 hover:border-accent-red hover:text-accent-red";
    return (
        <button type="button" disabled={disabled} className={`${base} ${cls}`}>
            {icon}
            {children}
        </button>
    );
}

function RoleNote({ requires }: { requires: string }) {
    return (
        <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 inline-flex items-center gap-1.5">
            <Award size={10} />
            {requires} only
        </span>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="py-4 text-sm text-zinc-500 italic">{children}</p>;
}
