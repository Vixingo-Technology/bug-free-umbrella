import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowLeft,
    Calendar,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    Trophy,
    Users,
} from "lucide-react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DojoMap from "@/components/branches/dojo-map-wrapper";
import { prisma } from "@/lib/prisma";
import { TIER_RANK, TIER_STYLES } from "@/lib/achievements/catalog";
import type { AchievementTier } from "@/prisma/generated/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Dojo — JKA Bangladesh" };
    try {
        const d = await prisma.dojo.findUnique({
            where: { id },
            select: { name: true, city: true },
        });
        if (!d) return { title: "Dojo — JKA Bangladesh" };
        return {
            title: `${d.name} — JKA Bangladesh`,
            description: `${d.name}${d.city ? ` in ${d.city}` : ""} — a certified JKA Bangladesh dojo. View instructors, students, and location.`,
        };
    } catch {
        return { title: "Dojo — JKA Bangladesh" };
    }
}

type Schedule = { day: string; time: string }[];

export default async function DojoDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

    let dojo: any = null;
    try {
        const d = await prisma.dojo.findUnique({
            where: { id },
            include: {
                students: {
                    where: { user: { isActive: true } },
                    include: {
                        user: { select: { id: true, fullName: true, avatarUrl: true, roleId: true } },
                        achievements: {
                            select: {
                                unlockedAt: true,
                                achievement: {
                                    select: { slug: true, name: true, icon: true, tier: true },
                                },
                            },
                        },
                    },
                },
                instructors: {
                    include: { user: { select: { id: true, fullName: true, avatarUrl: true, roleId: true, student: { select: { currentRank: true, memberNumber: true } } } } },
                },
                managers: {
                    include: { user: { select: { id: true, fullName: true, avatarUrl: true, roleId: true, student: { select: { currentRank: true, memberNumber: true } } } } },
                },
                owner: {
                    include: { user: { select: { id: true, fullName: true, avatarUrl: true, roleId: true, student: { select: { currentRank: true, memberNumber: true } } } } },
                },
            },
        });
        if (d) {
            const students = d.students.map((s) => ({
                id: s.id,
                fullName: s.user.fullName,
                avatarUrl: s.user.avatarUrl,
                role: s.user.roleId,
                currentRank: s.currentRank,
                memberNumber: s.memberNumber,
                achievements: s.achievements,
            }));
            const staff = [
                ...(d.owner ? [{
                    id: d.owner.id,
                    fullName: d.owner.user.fullName,
                    avatarUrl: d.owner.user.avatarUrl,
                    role: "DOJO_OWNER" as const,
                    currentRank: d.owner.user.student?.currentRank ?? "—",
                    memberNumber: d.owner.user.student?.memberNumber ?? null,
                    achievements: [] as never[],
                }] : []),
                ...d.managers.map((m) => ({
                    id: m.id,
                    fullName: m.user.fullName,
                    avatarUrl: m.user.avatarUrl,
                    role: "DOJO_MANAGER" as const,
                    currentRank: m.user.student?.currentRank ?? "—",
                    memberNumber: m.user.student?.memberNumber ?? null,
                    achievements: [] as never[],
                })),
                ...d.instructors.map((i) => ({
                    id: i.id,
                    fullName: i.user.fullName,
                    avatarUrl: i.user.avatarUrl,
                    role: "INSTRUCTOR" as const,
                    currentRank: i.user.student?.currentRank ?? "—",
                    memberNumber: i.user.student?.memberNumber ?? null,
                    achievements: [] as never[],
                })),
            ];
            dojo = { ...d, members: [...staff, ...students] };
        }
    } catch {
        notFound();
    }

    if (!dojo || !dojo.isActive) notFound();

    // Decorate each member with their top achievement (highest tier, then
    // most recent unlock) so we can sort + render the badge row.
    const decorated = dojo.members.map((m: any) => {
        const sorted = [...m.achievements].sort((a: any, b: any) => {
            const tierDelta =
                TIER_RANK[b.achievement.tier as AchievementTier] -
                TIER_RANK[a.achievement.tier as AchievementTier];
            if (tierDelta !== 0) return tierDelta;
            return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
        });
        return {
            ...m,
            topAchievement: sorted[0] ?? null,
            topTierRank: sorted[0] ? TIER_RANK[sorted[0].achievement.tier as AchievementTier] : 0,
            achievementCount: m.achievements.length,
        };
    });

    const instructors = decorated.filter((m: any) =>
        ["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER"].includes(m.role),
    );
    // Sort students by top-achievement tier (desc), then by total count,
    // then alphabetically. Top achievers float to the top of the list.
    const students = decorated
        .filter((m: any) => m.role === "STUDENT")
        .sort((a: any, b: any) => {
            if (b.topTierRank !== a.topTierRank) return b.topTierRank - a.topTierRank;
            if (b.achievementCount !== a.achievementCount)
                return b.achievementCount - a.achievementCount;
            return a.fullName.localeCompare(b.fullName);
        });

    const schedule: Schedule = Array.isArray(dojo.schedule)
        ? (dojo.schedule as Schedule)
        : [];

    const initial = dojo.name.charAt(0).toUpperCase();
    const hasCoords =
        typeof dojo.latitude === "number" &&
        typeof dojo.longitude === "number" &&
        Number.isFinite(dojo.latitude) &&
        Number.isFinite(dojo.longitude);

    return (
        <main className="min-h-screen bg-zinc-50 w-full overflow-hidden">
            <Navbar />

            {/* Hero / cover */}
            <section className="pt-32 bg-bg-charcoal border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
                    <Link
                        href="/branches"
                        className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8"
                    >
                        <ArrowLeft size={12} />
                        All branches
                    </Link>

                    <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
                        <div className="w-28 h-28 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-zinc-200">
                            {dojo.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={dojo.logoUrl}
                                    alt={`${dojo.name} logo`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-karate font-bold text-zinc-900">
                                    {initial}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-2">
                                Certified branch
                            </p>
                            <h1 className="font-karate text-2xl md:text-4xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                                {dojo.name}
                            </h1>
                            <div className="h-px w-16 bg-accent-red mt-4 mb-3" />
                            {(dojo.city || dojo.address) && (
                                <p className="flex items-center gap-2 text-zinc-600 text-sm">
                                    <MapPin size={14} className="text-accent-red" />
                                    {[dojo.address, dojo.city]
                                        .filter(Boolean)
                                        .join(", ")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats row */}
            <section className="bg-white border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Stat
                        icon={Users}
                        label="Students"
                        value={students.length}
                    />
                    <Stat
                        icon={GraduationCap}
                        label="Instructors"
                        value={instructors.length}
                    />
                    <Stat
                        icon={Trophy}
                        label="Members"
                        value={dojo.members.length}
                    />
                    <Stat
                        icon={Calendar}
                        label="Schedule"
                        value={schedule.length > 0 ? `${schedule.length} sessions` : "—"}
                    />
                </div>
            </section>

            {/* Main two-column layout */}
            <section className="py-12">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Map */}
                        <Card title="Location">
                            {hasCoords ? (
                                <DojoMap
                                    latitude={dojo.latitude as number}
                                    longitude={dojo.longitude as number}
                                    name={dojo.name}
                                    address={dojo.address}
                                />
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Map location not provided.
                                </p>
                            )}
                            {dojo.address && (
                                <p className="mt-4 text-sm text-zinc-700 flex items-start gap-2">
                                    <MapPin
                                        size={14}
                                        className="text-accent-red mt-0.5 shrink-0"
                                    />
                                    <span>{dojo.address}</span>
                                </p>
                            )}
                        </Card>

                        {/* Instructors */}
                        <Card
                            title="Instructors"
                            count={instructors.length}
                        >
                            {instructors.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No instructors listed yet.
                                </p>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {instructors.map((m: any) => (
                                        <MemberRow key={m.id} member={m} />
                                    ))}
                                </ul>
                            )}
                        </Card>

                        {/* Students — sorted by top achievement tier */}
                        <Card
                            title={
                                students.some((s: any) => s.topAchievement)
                                    ? "Students — Top Achievers First"
                                    : "Students"
                            }
                            count={students.length}
                        >
                            {students.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No students listed yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {students.map((m: any) => (
                                        <StudentCard key={m.id} member={m} />
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card title="Contact">
                            <ul className="space-y-3 text-sm">
                                {dojo.phone && (
                                    <li className="flex items-start gap-2 text-zinc-700">
                                        <Phone
                                            size={14}
                                            className="text-accent-red mt-0.5 shrink-0"
                                        />
                                        <a
                                            href={`tel:${dojo.phone}`}
                                            className="hover:text-accent-red transition-colors"
                                        >
                                            {dojo.phone}
                                        </a>
                                    </li>
                                )}
                                {dojo.email && (
                                    <li className="flex items-start gap-2 text-zinc-700">
                                        <Mail
                                            size={14}
                                            className="text-accent-red mt-0.5 shrink-0"
                                        />
                                        <a
                                            href={`mailto:${dojo.email}`}
                                            className="hover:text-accent-red transition-colors break-all"
                                        >
                                            {dojo.email}
                                        </a>
                                    </li>
                                )}
                                {!dojo.phone && !dojo.email && (
                                    <li className="text-zinc-500">
                                        No public contact details.
                                    </li>
                                )}
                            </ul>
                        </Card>

                        <Card title="Schedule">
                            {schedule.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    Schedule not published yet.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {schedule.map((s, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100 last:border-0"
                                        >
                                            <span className="font-semibold text-zinc-900">
                                                {s.day}
                                            </span>
                                            <span className="text-zinc-600 font-mono text-xs">
                                                {s.time}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Users;
    label: string;
    value: number | string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-accent-red/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-accent-red" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                    {label}
                </p>
                <p className="font-karate text-lg font-bold text-zinc-900 leading-tight truncate">
                    {value}
                </p>
            </div>
        </div>
    );
}

function Card({
    title,
    count,
    children,
}: {
    title: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <h2 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h2>
                {typeof count === "number" && (
                    <span className="text-xs font-mono font-bold text-zinc-400">
                        {count}
                    </span>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function MemberRow({ member }: { member: any }) {
    const initial = member.fullName.charAt(0).toUpperCase();
    const roleLabel =
        member.role === "DOJO_OWNER"
            ? "Dojo Head"
            : member.role === "DOJO_MANAGER"
              ? "Manager"
              : "Instructor";
    return (
        <li>
            <Link
                href={`/members/${member.id}`}
                className="flex items-center gap-4 py-3 group hover:bg-zinc-50 -mx-2 px-2 rounded-sm transition-colors"
            >
                <div className="w-11 h-11 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                    {member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-700 bg-zinc-100">
                            {initial}
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                        {member.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {roleLabel} · {member.currentRank}
                    </p>
                </div>
            </Link>
        </li>
    );
}

function StudentCard({ member }: { member: any }) {
    const initial = member.fullName.charAt(0).toUpperCase();
    const top = member.topAchievement;
    const tierStyle: (typeof TIER_STYLES)[AchievementTier] | null = top
        ? TIER_STYLES[top.achievement.tier as AchievementTier]
        : null;
    const TopIcon: LucideIcon | null = top
        ? (Icons as unknown as Record<string, LucideIcon>)[top.achievement.icon] ?? Icons.Award
        : null;

    return (
        <Link
            href={`/members/${member.id}`}
            className={`group relative flex flex-col items-center text-center p-3 border rounded-sm hover:shadow-sm transition-all bg-white ${
                tierStyle ? `${tierStyle.ring} ${tierStyle.glow ?? ""}` : "border-zinc-200 hover:border-accent-red"
            }`}
        >
            {top && tierStyle && TopIcon && (
                <span
                    className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center ${tierStyle.bg} ${tierStyle.ring}`}
                    title={`${top.achievement.name} · ${tierStyle.label}`}
                >
                    <TopIcon size={13} className={tierStyle.text} />
                </span>
            )}
            <div className="w-14 h-14 rounded-full bg-zinc-200 overflow-hidden">
                {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-700 bg-zinc-100">
                        {initial}
                    </span>
                )}
            </div>
            <p className="font-semibold text-xs text-zinc-900 mt-2 truncate w-full group-hover:text-accent-red transition-colors">
                {member.fullName}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate w-full">
                {member.currentRank}
            </p>
            {top && tierStyle && (
                <span
                    className={`mt-2 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${tierStyle.chip} truncate max-w-full`}
                    title={top.achievement.name}
                >
                    {top.achievement.name}
                </span>
            )}
            {member.achievementCount > 1 && (
                <span className="mt-1 text-[9px] font-mono text-zinc-400">
                    +{member.achievementCount - 1} more
                </span>
            )}
        </Link>
    );
}
