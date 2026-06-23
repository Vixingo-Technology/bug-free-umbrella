import type { Metadata } from "next";
import Link from "next/link";
import {
    Activity,
    AlertCircle,
    ArrowRight,
    CalendarClock,
    GraduationCap,
    Megaphone,
    PartyPopper,
    ShieldAlert,
    Users,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { hasAtLeast, requireDojoRole, ROLE_LABEL } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Dojo Dashboard — JKA Bangladesh",
};

type SearchParams = Promise<{
    enlistment?: string;
    denied?: string;
}>;

export default async function DojoOverviewPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const session = await requireDojoRole("DOJO_INSTRUCTOR");
    const params = await searchParams;
    const showWelcome = params.enlistment === "success";
    const showDenied = params.denied === "1";

    return (
        <>
            {showWelcome && (
                <Banner
                    tone="success"
                    icon={<PartyPopper size={20} />}
                    title="Welcome to JKA Bangladesh"
                    body="Your dojo enlistment is complete. Federation staff will email your official affiliation certificate within two working days."
                />
            )}
            {showDenied && (
                <Banner
                    tone="warn"
                    icon={<ShieldAlert size={20} />}
                    title="That section is above your role"
                    body={`You're signed in as ${ROLE_LABEL[session.role]}. Ask your Dojo Head if you need elevated access.`}
                />
            )}

            <DojoPageHeader
                eyebrow="Overview"
                title={`Welcome back, ${firstName(session.fullName)}`}
                description={`You're signed in as ${ROLE_LABEL[session.role]}. Here is what's happening at your dojo today.`}
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard
                    label="Active students"
                    value="48"
                    sub="+3 this month"
                    icon={Users}
                />
                <StatCard
                    label="Attendance this week"
                    value="86%"
                    sub="across 4 classes"
                    icon={Activity}
                />
                <StatCard
                    label="Next class"
                    value="Today · 6 PM"
                    sub="Junior kihon"
                    icon={CalendarClock}
                />
                <StatCard
                    label="Belt tests in queue"
                    value="7"
                    sub="3 pending review"
                    icon={GraduationCap}
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card title="Belt test pipeline" className="lg:col-span-2">
                    <BeltPipelinePreview roleAccess={session.role} />
                </Card>
                <Card title="Quick actions">
                    <QuickActions role={session.role} />
                </Card>
            </div>

            {hasAtLeast(session.role, "DOJO_MANAGER") && (
                <Card title="Financial snapshot" className="mt-6">
                    <div className="grid sm:grid-cols-3 gap-4">
                        <KV
                            label="Dues collected (Jun)"
                            value="৳ 1,42,500"
                            sub="32 of 48 paid"
                        />
                        <KV
                            label="Pending renewals"
                            value="6 members"
                            sub="3 expired"
                        />
                        <KV
                            label="Shop revenue"
                            value="৳ 18,300"
                            sub="this month"
                        />
                    </div>
                </Card>
            )}

            {hasAtLeast(session.role, "DOJO_OWNER") && (
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
        <div
            className={`rounded-sm border p-5 mb-8 flex items-start gap-4 ${palette}`}
        >
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
            >
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
            <div className="font-karate text-2xl font-bold text-zinc-900">
                {value}
            </div>
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
        <div
            className={`bg-white border border-zinc-200 rounded-sm shadow-sm ${className}`}
        >
            <div className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function KV({
    label,
    value,
    sub,
}: {
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                {label}
            </p>
            <p className="font-karate text-xl font-bold text-zinc-900">
                {value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        </div>
    );
}

function BeltPipelinePreview({ roleAccess }: { roleAccess: string }) {
    const stages = [
        {
            label: "Applied",
            count: 4,
            sub: "Awaiting test schedule",
            actorRole: "Instructor",
        },
        {
            label: "Qualified",
            count: 3,
            sub: "Tested · awaiting Manager review",
            actorRole: "Manager",
        },
        {
            label: "Verified",
            count: 2,
            sub: "Cleared · awaiting Owner sign-off",
            actorRole: "Dojo Head",
        },
        {
            label: "Submitted to JKA",
            count: 5,
            sub: "Awaiting federation certificate",
            actorRole: "Federation",
        },
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
                href="/dojo/dashboard/gradings"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-accent-red hover:text-accent-red/80 transition-colors mt-2"
            >
                Manage belt tests
                <ArrowRight size={12} />
            </Link>
            {/* roleAccess kept for future role-conditional rendering */}
            <span className="sr-only">{roleAccess}</span>
        </div>
    );
}

function QuickActions({ role }: { role: string }) {
    const actions: { href: string; label: string; min: number }[] = [
        { href: "/dojo/dashboard/students", label: "Add a student", min: 1 },
        {
            href: "/dojo/dashboard/attendance",
            label: "Take attendance",
            min: 1,
        },
        {
            href: "/dojo/dashboard/gradings",
            label: "Schedule a belt test",
            min: 1,
        },
        {
            href: "/dojo/dashboard/renewals",
            label: "Mark a renewal paid",
            min: 2,
        },
        { href: "/dojo/dashboard/events", label: "Plan an event", min: 3 },
        {
            href: "/dojo/dashboard/announcements",
            label: "Post an announcement",
            min: 3,
        },
    ];
    const rank: Record<string, number> = {
        DOJO_INSTRUCTOR: 1,
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
