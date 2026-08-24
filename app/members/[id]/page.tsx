import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
    Award,
    ArrowLeft,
    CheckCircle2,
    Download,
    ExternalLink,
    GraduationCap,
    MapPin,
    Trophy,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DigitalCard, {
    type MembershipStatusLabel,
} from "@/components/portal/digital-card";
import AchievementCard from "@/components/achievements/achievement-card";
import { prisma } from "@/lib/prisma";
import { TIER_RANK } from "@/lib/achievements/catalog";
import type { AchievementTier } from "@/prisma/generated/client";
import { DEFAULT_TIME_ZONE, formatDateLong } from "@/lib/format/datetime";
import { formatBeltRank } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Member — JKA Bangladesh" };
    try {
        const m = await prisma.user.findUnique({
            where: { id },
            select: { fullName: true, student: { select: { currentRank: true } } },
        });
        if (!m) return { title: "Member — JKA Bangladesh" };
        const rank = m.student?.currentRank ? formatBeltRank(m.student.currentRank) : "Member";
        return {
            title: `${m.fullName} — JKA Bangladesh`,
            description: `${m.fullName} (${rank}) — public profile on JKA Bangladesh.`,
        };
    } catch {
        return { title: "Member — JKA Bangladesh" };
    }
}

function computeStatus(expiry: Date | null): MembershipStatusLabel {
    if (!expiry) return "Active";
    const daysLeft = Math.ceil(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= 30) return "Expiring Soon";
    return "Active";
}

const roleLabel: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Dojo Manager",
    DOJO_OWNER: "Dojo Head",
    ADMIN: "Administrator",
};

export default async function PublicMemberPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

    let member: any = null;
    try {
        const u = await prisma.user.findUnique({
            where: { id },
            include: {
                student: {
                    include: {
                        dojo: { select: { id: true, name: true, city: true } },
                        gradings: {
                            orderBy: { createdAt: "asc" },
                            include: {
                                fromRank: { select: { name: true, colorHex: true } },
                                toRank: {
                                    select: { name: true, colorHex: true, orderIndex: true },
                                },
                                gradingEvent: { select: { name: true, eventDate: true } },
                            },
                        },
                        achievements: {
                            include: {
                                achievement: {
                                    select: { slug: true, name: true, description: true, icon: true, tier: true },
                                },
                            },
                        },
                    },
                },
                tournamentEntries: {
                    include: {
                        tournament: { select: { id: true, name: true, date: true, location: true } },
                        matchesAsP1: { select: { id: true, winnerId: true } },
                        matchesAsP2: { select: { id: true, winnerId: true } },
                        matchesWon: { select: { id: true } },
                    },
                },
            },
        });
        if (u) {
            member = {
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                phone: u.phone,
                avatarUrl: u.avatarUrl,
                isActive: u.isActive,
                role: u.roleId,
                memberNumber: u.memberNumber ?? null,
                currentRank: u.student?.currentRank ?? "—",
                joinDate: u.student?.joinDate ?? null,
                expiryDate: u.student?.expiryDate ?? null,
                dojo: u.student?.dojo ?? null,
                gradings: u.student?.gradings ?? [],
                tournamentEntries: u.tournamentEntries ?? [],
                achievements: u.student?.achievements ?? [],
            };
        }
    } catch {
        notFound();
    }

    if (!member || !member.isActive) notFound();

    const status = computeStatus(
        member.expiryDate ? new Date(member.expiryDate) : null,
    );

    const passedGradings = member.gradings.filter(
        (g: any) => g.result === "PASSED",
    );
    const certificates = passedGradings.filter((g: any) => g.certificateUrl);

    const tournamentEntries = (member.tournamentEntries ?? []).filter(
        (e: any) => e.tournament,
    );

    const achievements = [...(member.achievements ?? [])].sort((a: any, b: any) => {
        const tierDelta =
            TIER_RANK[b.achievement.tier as AchievementTier] -
            TIER_RANK[a.achievement.tier as AchievementTier];
        if (tierDelta !== 0) return tierDelta;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    });

    return (
        <main className="min-h-screen bg-zinc-50 w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 bg-bg-charcoal border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
                    {member.dojo ? (
                        <Link
                            href={`/branches/${member.dojo.id}`}
                            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-6"
                        >
                            <ArrowLeft size={12} />
                            {member.dojo.name}
                        </Link>
                    ) : (
                        <Link
                            href="/branches"
                            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-6"
                        >
                            <ArrowLeft size={12} />
                            All branches
                        </Link>
                    )}

                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-2">
                        Verified member
                    </p>
                    <h1 className="font-karate text-2xl md:text-4xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                        {member.fullName}
                    </h1>
                    <div className="h-px w-16 bg-accent-red mt-4 mb-4" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-600 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                            <Award size={14} className="text-accent-red" />
                            {formatBeltRank(member.currentRank)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <GraduationCap size={14} className="text-accent-red" />
                            {roleLabel[member.role] ?? member.role}
                        </span>
                        {member.dojo && (
                            <Link
                                href={`/branches/${member.dojo.id}`}
                                className="inline-flex items-center gap-1.5 hover:text-accent-red transition-colors"
                            >
                                <MapPin size={14} className="text-accent-red" />
                                {member.dojo.name}
                                {member.dojo.city ? ` · ${member.dojo.city}` : ""}
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="py-12">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-3 gap-8">
                    {/* Sidebar: digital card */}
                    <aside className="space-y-6 order-1 lg:order-2">
                        <div className="h-[300px]">
                            <DigitalCard
                                fullName={member.fullName}
                                currentRank={member.currentRank}
                                dojoName={member.dojo?.name}
                                role={roleLabel[member.role] ?? member.role}
                                membershipStatus={status}
                                memberNumber={member.memberNumber}
                                avatarUrl={member.avatarUrl}
                            />
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5">
                            <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500 mb-3">
                                At a glance
                            </h3>
                            <dl className="space-y-2 text-sm">
                                <Stat
                                    label="Gradings passed"
                                    value={passedGradings.length}
                                />
                                <Stat
                                    label="Certificates"
                                    value={certificates.length}
                                />
                                <Stat
                                    label="Tournaments"
                                    value={tournamentEntries.length}
                                />
                                <Stat
                                    label="Achievements"
                                    value={achievements.length}
                                />
                                {member.joinDate && (
                                    <Stat
                                        label="Member since"
                                        value={new Intl.DateTimeFormat("en-GB", {
                                            month: "short",
                                            year: "numeric",
                                            timeZone: DEFAULT_TIME_ZONE,
                                        }).format(new Date(member.joinDate))}
                                    />
                                )}
                            </dl>
                        </div>
                    </aside>

                    {/* Main column */}
                    <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
                        <Card title="Achievements" count={achievements.length}>
                            {achievements.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No achievements unlocked yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {achievements.map((m: any) => (
                                        <AchievementCard
                                            key={m.achievement.slug}
                                            name={m.achievement.name}
                                            description={m.achievement.description}
                                            icon={m.achievement.icon}
                                            tier={m.achievement.tier}
                                            unlocked
                                            unlockedAt={m.unlockedAt}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card title="Belt progress" count={passedGradings.length}>
                            {passedGradings.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No grading history yet.
                                </p>
                            ) : (
                                <ol className="relative border-l-2 border-zinc-200 ml-3 space-y-6">
                                    {passedGradings.map((g: any) => (
                                        <BeltStep key={g.id} grading={g} />
                                    ))}
                                </ol>
                            )}
                        </Card>

                        <Card title="Certificates" count={certificates.length}>
                            {certificates.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No certificates issued yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {certificates.map((g: any) => (
                                        <CertificateCard
                                            key={g.id}
                                            grading={g}
                                        />
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card
                            title="Tournament participation"
                            count={tournamentEntries.length}
                        >
                            {tournamentEntries.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    Hasn&apos;t competed in a tournament yet.
                                </p>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {tournamentEntries.map((e: any) => (
                                        <TournamentRow key={e.id} entry={e} />
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

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-bold text-zinc-900 font-mono">{value}</dd>
        </div>
    );
}

function BeltStep({ grading }: { grading: any }) {
    const rankColor = grading.toRank?.colorHex || "#cccccc";
    const rawRankName = grading.toRank?.name;
    const rankName = rawRankName ? formatBeltRank(rawRankName) : "Belt rank";
    const fromRankName = grading.fromRank?.name ? formatBeltRank(grading.fromRank.name) : null;
    const date = grading.gradingEvent?.eventDate
        ? new Date(grading.gradingEvent.eventDate)
        : new Date(grading.createdAt);
    return (
        <li className="ml-6">
            <span
                className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: rankColor }}
                aria-hidden
            />
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-bold text-zinc-900">
                        {rankName}
                        {fromRankName ? (
                            <span className="text-xs font-normal text-zinc-500 ml-2">
                                from {fromRankName}
                            </span>
                        ) : null}
                    </p>
                    {grading.gradingEvent?.name && (
                        <p className="text-xs text-zinc-500 mt-1">
                            {grading.gradingEvent.name}
                        </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                        {formatDateLong(date)}
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-sm shrink-0">
                    <CheckCircle2 size={12} />
                    Passed
                </span>
            </div>
        </li>
    );
}

function CertificateCard({ grading }: { grading: any }) {
    const rawRankName = grading.toRank?.name;
    const rankName = rawRankName ? formatBeltRank(rawRankName) : "Certificate";
    const rankColor = grading.toRank?.colorHex || "#1a1a1a";
    const date = grading.gradingEvent?.eventDate
        ? new Date(grading.gradingEvent.eventDate)
        : new Date(grading.createdAt);
    return (
        <a
            href={grading.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 border border-zinc-200 rounded-sm hover:border-accent-red hover:shadow-sm transition-all bg-white"
        >
            <div
                className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0"
                style={{ backgroundColor: rankColor }}
            >
                <Award size={20} className="text-white drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                    {rankName}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                    {new Intl.DateTimeFormat("en-GB", {
                        month: "short",
                        year: "numeric",
                        timeZone: DEFAULT_TIME_ZONE,
                    }).format(date)}
                </p>
            </div>
            <Download
                size={14}
                className="text-zinc-400 group-hover:text-accent-red transition-colors shrink-0"
            />
        </a>
    );
}

function TournamentRow({ entry }: { entry: any }) {
    const t = entry.tournament;
    const matchesPlayed =
        (entry.matchesAsP1?.length ?? 0) + (entry.matchesAsP2?.length ?? 0);
    const wins = entry.matchesWon?.length ?? 0;
    const date = t.date ? new Date(t.date) : null;
    return (
        <li className="py-3 flex items-start gap-4">
            <div className="w-10 h-10 rounded-sm bg-accent-red/10 flex items-center justify-center shrink-0">
                <Trophy size={16} className="text-accent-red" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-zinc-900 truncate">
                    {t.name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                    {date
                        ? new Intl.DateTimeFormat("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: DEFAULT_TIME_ZONE,
                          }).format(date)
                        : ""}
                    {t.location ? ` · ${t.location}` : ""}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600">
                    <span>
                        <span className="font-bold text-zinc-900">
                            {matchesPlayed}
                        </span>{" "}
                        match{matchesPlayed === 1 ? "" : "es"}
                    </span>
                    <span>
                        <span className="font-bold text-zinc-900">{wins}</span>{" "}
                        win{wins === 1 ? "" : "s"}
                    </span>
                    {entry.category && (
                        <span className="px-2 py-0.5 rounded-sm bg-zinc-100 font-mono text-[10px] tracking-widest uppercase">
                            {entry.category}
                        </span>
                    )}
                </div>
            </div>
            <ExternalLink size={14} className="text-zinc-300 shrink-0 mt-1" />
        </li>
    );
}
