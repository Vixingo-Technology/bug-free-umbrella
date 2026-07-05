import Link from "next/link";
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    CreditCard,
    GraduationCap,
    Megaphone,
    PartyPopper,
    ShieldAlert,
    Users,
    XCircle,
    Zap,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import DojoSetupChecklist from "@/components/portal/dojo-setup-checklist";
import { hasAtLeast, ROLE_LABEL, type DojoRole } from "@/lib/dojo-roles";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Stats = {
    activeStudents: number;
    recentJoins: number;
    weeklyAttendanceRate: number | null;
    weeklyCheckins: number;
    beltTestsPending: number;
    expiringSoon: number;
    expired: number;
};

type RenewalStatus = {
    state: "EXPIRING" | "EXPIRED";
    daysLeft: number;
    expiryLabel: string;
};

type Props = {
    userId: string;
    role: DojoRole;
    fullName: string;
    dojoId: string | null;
    dojoName: string | null;
    pendingApproval: boolean;
    showWelcome?: boolean;
    showDenied?: boolean;
};

export default async function DojoOverview({
    userId,
    role,
    fullName,
    dojoId,
    dojoName,
    pendingApproval,
    showWelcome = false,
    showDenied = false,
}: Props) {
    const stats = await loadStats(dojoId);
    const renewal = dojoId ? await loadRenewalStatus(dojoId) : null;
    const activation =
        role === "DOJO_OWNER" ? await loadActivation(userId) : null;

    return (
        <>
            {activation && (
                <ActivationBanner
                    applicationId={activation.applicationId}
                    email={activation.email}
                />
            )}
            {pendingApproval && !activation && (
                <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 text-amber-900 p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        !
                    </div>
                    <div className="text-sm leading-relaxed">
                        <p className="font-semibold mb-0.5">
                            Your enlistment is awaiting JKA review
                        </p>
                        <p>
                            Federation staff are verifying your application.
                            The dashboard is unlocked with sample data until
                            your dojo is approved — usually within 1–2 working
                            days.
                        </p>
                    </div>
                </div>
            )}
            {renewal && <RenewalBanner status={renewal} />}
            {showWelcome && (
                <Banner
                    tone="success"
                    icon={<PartyPopper size={20} />}
                    title="Welcome to JKA Bangladesh"
                    body="Your dojo enlistment is complete. Federation staff will review your application within two working days."
                />
            )}
            {showDenied && (
                <Banner
                    tone="warn"
                    icon={<ShieldAlert size={20} />}
                    title="That section is above your role"
                    body={`You're signed in as ${ROLE_LABEL[role]}. Ask your Dojo Head if you need elevated access.`}
                />
            )}

            {role === "DOJO_OWNER" && (
                <DojoSetupChecklist
                    userId={userId}
                    dojoId={dojoId}
                    pendingApproval={pendingApproval}
                />
            )}

            <DojoPageHeader
                eyebrow="Overview"
                title={`Welcome back, ${firstName(fullName)}`}
                description={`You're signed in as ${ROLE_LABEL[role]}${
                    dojoName ? ` at ${dojoName}` : ""
                }.`}
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard
                    label="Active students"
                    value={stats.activeStudents.toString()}
                    sub={
                        stats.recentJoins > 0
                            ? `+${stats.recentJoins} this month`
                            : "All-time roster"
                    }
                    icon={Users}
                />
                <StatCard
                    label="Attendance this week"
                    value={
                        stats.weeklyAttendanceRate != null
                            ? `${stats.weeklyAttendanceRate}%`
                            : "—"
                    }
                    sub={`${stats.weeklyCheckins} check-ins`}
                    icon={Activity}
                />
                <StatCard
                    label="Belt tests pending"
                    value={stats.beltTestsPending.toString()}
                    sub="In federation pipeline"
                    icon={GraduationCap}
                />
                <StatCard
                    label="Next class"
                    value="Today · 6 PM"
                    sub="Set in Schedule"
                    icon={CalendarClock}
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card title="Belt test pipeline" className="lg:col-span-2">
                    <BeltPipelinePreview pending={stats.beltTestsPending} />
                </Card>
                <Card title="Quick actions">
                    <QuickActions role={role} />
                </Card>
            </div>

            {hasAtLeast(role, "DOJO_MANAGER") && (
                <Card title="Financial snapshot" className="mt-6">
                    <div className="grid sm:grid-cols-3 gap-4">
                        <KV
                            label="Active members"
                            value={stats.activeStudents.toString()}
                            sub={`${stats.expiringSoon} expiring within 30 days`}
                        />
                        <KV
                            label="Expired memberships"
                            value={stats.expired.toString()}
                            sub="Renew to keep training"
                        />
                        <KV
                            label="Pending grading applications"
                            value={stats.beltTestsPending.toString()}
                            sub="From real data"
                        />
                    </div>
                </Card>
            )}

            {hasAtLeast(role, "DOJO_OWNER") && (
                <Card title="From federation HQ" className="mt-6">
                    <ul className="divide-y divide-zinc-200">
                        <FedItem
                            icon={Megaphone}
                            title="National tournament dates posted"
                            body="December 14 – Dhaka Indoor Stadium. Registration opens next week."
                        />
                        <FedItem
                            icon={GraduationCap}
                            title="Visiting Sensei seminar"
                            body="Sensei Tanaka (7th Dan) visiting in October. Reserve slots for your trainers."
                        />
                    </ul>
                </Card>
            )}
        </>
    );
}

async function loadStats(dojoId: string | null): Promise<Stats> {
    if (!dojoId) {
        return {
            activeStudents: 48,
            recentJoins: 3,
            weeklyAttendanceRate: 86,
            weeklyCheckins: 140,
            beltTestsPending: 7,
            expiringSoon: 6,
            expired: 3,
        };
    }

    const weekAgo = new Date(Date.now() - WEEK_MS);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const [
        activeStudents,
        recentJoins,
        weeklyCheckins,
        weeklyPresent,
        beltTestsPending,
        expiringSoon,
        expired,
    ] = await Promise.all([
        prisma.student.count({ where: { dojoId, user: { isActive: true } } }),
        prisma.student.count({ where: { dojoId, joinDate: { gte: monthAgo } } }),
        prisma.attendance.count({ where: { dojoId, date: { gte: weekAgo } } }),
        prisma.attendance.count({
            where: { dojoId, date: { gte: weekAgo }, present: true },
        }),
        prisma.gradingApplication.count({
            where: { status: "SUBMITTED", student: { dojoId } },
        }),
        prisma.student.count({
            where: { dojoId, expiryDate: { gte: today, lte: in30Days } },
        }),
        prisma.student.count({ where: { dojoId, expiryDate: { lt: today } } }),
    ]);

    const rate =
        weeklyCheckins > 0
            ? Math.round((weeklyPresent / weeklyCheckins) * 100)
            : null;

    return {
        activeStudents,
        recentJoins,
        weeklyAttendanceRate: rate,
        weeklyCheckins,
        beltTestsPending,
        expiringSoon,
        expired,
    };
}

async function loadActivation(
    userId: string
): Promise<{ applicationId: string; email: string } | null> {
    const app = await prisma.dojoApplication.findFirst({
        where: { userId, status: "PENDING_PAYMENT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true },
    });
    return app ? { applicationId: app.id, email: app.email } : null;
}

function ActivationBanner({
    applicationId,
    email,
}: {
    applicationId: string;
    email: string;
}) {
    const href = `/enlist-dojo/payment?applicationId=${encodeURIComponent(
        applicationId
    )}&email=${encodeURIComponent(email)}`;
    return (
        <div className="rounded-sm border border-accent-red/40 bg-accent-red/5 p-5 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-accent-red text-white flex items-center justify-center shrink-0">
                <Zap size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="font-serif text-base font-bold text-zinc-900 mb-1">
                    Activate your Dojo
                </h2>
                <p className="text-sm text-zinc-700 leading-relaxed">
                    Your enlistment is saved but your dojo isn&apos;t public
                    yet. Complete the one-time enlistment fee to activate
                    your listing and unlock the full dashboard.
                </p>
            </div>
            <Link
                href={href}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-sm shrink-0 bg-accent-red hover:bg-accent-red/90 text-white transition-colors"
            >
                <CreditCard size={12} />
                Pay now
            </Link>
        </div>
    );
}

async function loadRenewalStatus(dojoId: string): Promise<RenewalStatus | null> {
    const dojo = await prisma.dojo.findUnique({
        where: { id: dojoId },
        select: { expiryDate: true },
    });
    if (!dojo?.expiryDate) return null;

    const ms = dojo.expiryDate.getTime() - Date.now();
    const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (daysLeft > 30) return null;

    const expiryLabel = dojo.expiryDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    return {
        state: daysLeft < 0 ? "EXPIRED" : "EXPIRING",
        daysLeft,
        expiryLabel,
    };
}

function RenewalBanner({ status }: { status: RenewalStatus }) {
    const expired = status.state === "EXPIRED";
    const palette = expired
        ? "bg-red-50 border-red-200 text-red-900"
        : "bg-amber-50 border-amber-200 text-amber-900";
    const iconBg = expired ? "bg-red-500 text-white" : "bg-amber-500 text-white";
    const title = expired
        ? "Dojo membership has expired"
        : "Dojo membership expiring soon";
    const body = expired
        ? `Expired on ${status.expiryLabel} (${Math.abs(status.daysLeft)} day${
              Math.abs(status.daysLeft) === 1 ? "" : "s"
          } ago). Renew now to restore your public listing.`
        : `Expires ${status.expiryLabel} — ${status.daysLeft} day${
              status.daysLeft === 1 ? "" : "s"
          } left. Renew now to avoid interruption.`;

    return (
        <div className={`rounded-sm border p-5 mb-8 flex items-start gap-4 ${palette}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                {expired ? <XCircle size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="font-serif text-base font-bold mb-1">{title}</h2>
                <p className="text-sm leading-relaxed">{body}</p>
            </div>
            <Link
                href="/portal/dojo/settings#renewal"
                className={`inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-2 rounded-sm shrink-0 transition-colors ${
                    expired
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
            >
                <CreditCard size={12} />
                Renew now
            </Link>
        </div>
    );
}

function Banner({
    tone,
    icon,
    title,
    body,
}: {
    tone: "success" | "warn";
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    const palette =
        tone === "success"
            ? "bg-accent-red/10 border-accent-red/30 text-zinc-900"
            : "bg-amber-50 border-amber-200 text-amber-900";
    const iconBg =
        tone === "success" ? "bg-accent-red text-white" : "bg-amber-500 text-white";
    return (
        <div className={`rounded-sm border p-5 mb-8 flex items-start gap-4 ${palette}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div>
                <h2 className="font-serif text-base font-bold mb-1">{title}</h2>
                <p className="text-sm leading-relaxed">{body}</p>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
}: {
    label: string;
    value: string;
    sub: string;
    icon: typeof Users;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                    {label}
                </span>
                <Icon size={16} className="text-accent-red" />
            </div>
            <div className="font-karate text-2xl font-bold text-zinc-900">{value}</div>
            <div className="text-xs text-zinc-500 mt-1">{sub}</div>
        </div>
    );
}

function Card({
    title,
    children,
    className = "",
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`bg-white border border-zinc-200 rounded-sm shadow-sm ${className}`}>
            <div className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function KV({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                {label}
            </p>
            <p className="font-karate text-xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        </div>
    );
}

function BeltPipelinePreview({ pending }: { pending: number }) {
    const stages = [
        { label: "Applied", count: pending, sub: "Awaiting test schedule", actorRole: "Instructor" },
        { label: "Qualified", count: 0, sub: "Tested · awaiting Manager review", actorRole: "Manager" },
        { label: "Verified", count: 0, sub: "Cleared · awaiting Owner sign-off", actorRole: "Dojo Head" },
        { label: "Submitted to JKA", count: 0, sub: "Awaiting federation certificate", actorRole: "Federation" },
    ];
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stages.map((s) => (
                    <div
                        key={s.label}
                        className="bg-zinc-50 border border-zinc-200 rounded-sm p-3"
                    >
                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                            {s.label}
                        </p>
                        <p className="font-karate text-xl font-bold text-zinc-900 mt-1">
                            {s.count}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                            {s.sub}
                        </p>
                        <p className="text-[10px] tracking-widest uppercase font-bold text-accent-red mt-2">
                            {s.actorRole}
                        </p>
                    </div>
                ))}
            </div>
            <Link
                href="/portal/dojo/gradings"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-accent-red hover:text-accent-red/80 transition-colors mt-2"
            >
                Manage belt tests
                <ArrowRight size={12} />
            </Link>
        </div>
    );
}

function QuickActions({ role }: { role: string }) {
    const actions: { href: string; label: string; min: number }[] = [
        { href: "/portal/dojo/members", label: "Invite a member", min: 1 },
        { href: "/portal/dojo/attendance", label: "Take attendance", min: 1 },
        { href: "/portal/dojo/gradings", label: "Schedule a belt test", min: 1 },
        { href: "/portal/dojo/renewals", label: "Renew dojo membership", min: 2 },
        { href: "/portal/dojo/announcements", label: "Post an announcement", min: 3 },
    ];
    const rank: Record<string, number> = {
        INSTRUCTOR: 1,
        DOJO_MANAGER: 2,
        DOJO_OWNER: 3,
    };
    const visible = actions.filter((a) => (rank[role] ?? 0) >= a.min);
    return (
        <ul className="space-y-2">
            {visible.map((a) => (
                <li key={a.href}>
                    <Link
                        href={a.href}
                        className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-50 hover:text-accent-red transition-colors group"
                    >
                        {a.label}
                        <ArrowRight
                            size={14}
                            className="text-zinc-300 group-hover:text-accent-red transition-colors"
                        />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function FedItem({
    icon: Icon,
    title,
    body,
}: {
    icon: typeof AlertCircle;
    title: string;
    body: string;
}) {
    return (
        <li className="py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-sm bg-accent-red/10 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-accent-red" />
            </div>
            <div>
                <p className="font-semibold text-zinc-900 text-sm">{title}</p>
                <p className="text-zinc-600 text-sm">{body}</p>
            </div>
        </li>
    );
}

function firstName(s: string) {
    return s.split(/\s+/)[0] || s;
}
