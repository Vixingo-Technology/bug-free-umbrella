import type { Metadata } from "next";
import {
    AlertCircle,
    Award,
    CalendarPlus,
    CheckCircle2,
    Clock,
    CreditCard,
    Send,
    XCircle,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
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
    },
    {
        id: "2",
        name: "Anika Hossain",
        currentRank: "7th Kyu · Orange",
        targetRank: "6th Kyu · Green",
        appliedOn: "Jun 17",
        stage: "APPLIED",
        paymentStatus: "PAID",
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
    },
];

export default async function GradingsPage() {
    const session = await requireDojoRole("DOJO_INSTRUCTOR");
    const role = session.role;

    const candidates = session.dojo
        ? await loadRealCandidates(session.dojo.id)
        : SAMPLE;

    const applied = candidates.filter((c) => c.stage === "APPLIED");
    const qualified = candidates.filter((c) => c.stage === "QUALIFIED");
    const verified = candidates.filter((c) => c.stage === "VERIFIED");
    const submitted = candidates.filter((c) => c.stage === "SUBMITTED");

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

            <Stage
                title="1 · Applied"
                actor="Instructor schedules the test"
                count={applied.length}
            >
                {applied.length === 0 ? (
                    <Empty>No new applications.</Empty>
                ) : (
                    <ul className="divide-y divide-zinc-200">
                        {applied.map((c) => (
                            <li
                                key={c.id}
                                className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <CandidateInfo c={c} />
                                {hasAtLeast(role, "DOJO_INSTRUCTOR") ? (
                                    <div className="flex items-center gap-2">
                                        <Btn icon={<CalendarPlus size={14} />}>
                                            Schedule test
                                        </Btn>
                                        <Btn
                                            variant="ghost"
                                            icon={<XCircle size={14} />}
                                        >
                                            Decline
                                        </Btn>
                                    </div>
                                ) : (
                                    <RoleNote requires="Instructor" />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Stage>

            <Stage
                title="2 · Qualified after test"
                actor="Manager verifies dues & membership"
                count={qualified.length}
            >
                {qualified.length === 0 ? (
                    <Empty>No qualified candidates awaiting review.</Empty>
                ) : (
                    <ul className="divide-y divide-zinc-200">
                        {qualified.map((c) => (
                            <li
                                key={c.id}
                                className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <CandidateInfo c={c} />
                                {hasAtLeast(role, "DOJO_MANAGER") ? (
                                    <div className="flex items-center gap-2">
                                        {c.paymentStatus !== "PAID" && (
                                            <PaymentBadge
                                                status={c.paymentStatus}
                                            />
                                        )}
                                        <Btn
                                            icon={<CheckCircle2 size={14} />}
                                            disabled={
                                                c.paymentStatus !== "PAID"
                                            }
                                        >
                                            Mark verified
                                        </Btn>
                                    </div>
                                ) : (
                                    <RoleNote requires="Manager" />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Stage>

            <Stage
                title="3 · Verified by Manager"
                actor="Dojo Head submits to JKA"
                count={verified.length}
            >
                {verified.length === 0 ? (
                    <Empty>No candidates ready to submit.</Empty>
                ) : (
                    <ul className="divide-y divide-zinc-200">
                        {verified.map((c) => (
                            <li
                                key={c.id}
                                className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <CandidateInfo c={c} />
                                {hasAtLeast(role, "DOJO_OWNER") ? (
                                    <Btn icon={<Send size={14} />}>
                                        Submit to JKA HQ
                                    </Btn>
                                ) : (
                                    <RoleNote requires="Dojo Head" />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Stage>

            <Stage
                title="4 · Submitted to JKA"
                actor="Federation issues the certificate"
                count={submitted.length}
            >
                {submitted.length === 0 ? (
                    <Empty>No outstanding federation submissions.</Empty>
                ) : (
                    <ul className="divide-y divide-zinc-200">
                        {submitted.map((c) => (
                            <li
                                key={c.id}
                                className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <CandidateInfo c={c} />
                                <span className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-zinc-500">
                                    <Clock size={12} />
                                    Awaiting HQ
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Stage>
        </>
    );
}

async function loadRealCandidates(dojoId: string): Promise<Candidate[]> {
    // Only the "Applied" stage maps cleanly to the current schema. The
    // qualified/verified/submitted stages need a workflow table — until that
    // exists they read empty.
    const apps = await prisma.gradingApplication.findMany({
        where: {
            status: "SUBMITTED",
            member: { dojoId },
        },
        orderBy: { appliedAt: "desc" },
        include: {
            member: { select: { fullName: true, currentRank: true } },
            targetRank: { select: { name: true } },
        },
    });

    return apps.map((a) => ({
        id: a.id,
        name: a.member.fullName,
        currentRank: a.member.currentRank,
        targetRank: a.targetRank?.name ?? "—",
        appliedOn: a.appliedAt.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
        }),
        stage: "APPLIED" as const,
        paymentStatus: "PAID" as const,
    }));
}

function Stage({
    title,
    actor,
    count,
    children,
}: {
    title: string;
    actor: string;
    count: number;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{actor}</p>
                </div>
                <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                    {count} {count === 1 ? "candidate" : "candidates"}
                </span>
            </div>
            <div className="px-5">{children}</div>
        </section>
    );
}

function CandidateInfo({ c }: { c: Candidate }) {
    return (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-sm">
                {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
            </div>
            <div>
                <p className="font-semibold text-zinc-900 text-sm">{c.name}</p>
                <p className="text-xs text-zinc-500">
                    {c.currentRank} →{" "}
                    <span className="text-accent-red font-semibold">
                        {c.targetRank}
                    </span>
                </p>
                {c.note && (
                    <p className="text-xs text-zinc-500 mt-1 italic">
                        {c.note}
                    </p>
                )}
                <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold mt-1">
                    Applied {c.appliedOn}
                </p>
            </div>
        </div>
    );
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

function PaymentBadge({
    status,
}: {
    status: Candidate["paymentStatus"];
}) {
    if (status === "DUE")
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                <CreditCard size={10} />
                Dues unpaid
            </span>
        );
    if (status === "EXPIRED_MEMBERSHIP")
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                <AlertCircle size={10} />
                Membership expired
            </span>
        );
    return null;
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
