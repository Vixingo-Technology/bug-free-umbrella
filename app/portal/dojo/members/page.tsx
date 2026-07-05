import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Search, UserRound } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import InviteMemberModal from "@/components/dojo/invite-member-modal";
import { InviteActionButtons } from "@/components/dojo/invite-actions-buttons";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import {
    invitableRolesFor,
    ROLE_LABEL,
    type DojoRole,
    type InvitableRole,
} from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Members — Dojo Dashboard",
};

type RosterRole = InvitableRole;

type RosterMember = {
    id: string;
    name: string;
    email: string;
    role: RosterRole;
    rank: string;
    joined: string;
    status: "Active" | "Inactive";
};

type PendingInvite = {
    id: string;
    name: string;
    email: string;
    role: RosterRole;
    invitedAt: string;
};

const ROLE_BADGE: Record<RosterRole, string> = {
    STUDENT: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    INSTRUCTOR: "bg-sky-50 text-sky-800 border border-sky-200",
    DOJO_MANAGER: "bg-amber-50 text-amber-800 border border-amber-200",
};

const ROSTER_TABS = [
    { id: "students", label: "Students", role: "STUDENT" as RosterRole },
    { id: "instructors", label: "Instructors", role: "INSTRUCTOR" as RosterRole },
    { id: "managers", label: "Managers", role: "DOJO_MANAGER" as RosterRole },
    { id: "invited", label: "Invited", role: null },
] as const;

type TabId = (typeof ROSTER_TABS)[number]["id"];

function parseTab(raw: string | undefined): TabId {
    const match = ROSTER_TABS.find((t) => t.id === raw);
    return match?.id ?? "students";
}

export default async function MembersPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const session = await requireDojoRole("INSTRUCTOR");
    const canInvite = invitableRolesFor(session.role).length > 0;
    const dojoIsActivated = session.dojo?.isActive ?? false;

    const { tab: tabParam } = await searchParams;
    const activeTab = parseTab(tabParam);

    const rosters = {
        STUDENT: [] as RosterMember[],
        INSTRUCTOR: [] as RosterMember[],
        DOJO_MANAGER: [] as RosterMember[],
    };
    const invited = {
        STUDENT: [] as PendingInvite[],
        INSTRUCTOR: [] as PendingInvite[],
        DOJO_MANAGER: [] as PendingInvite[],
    };

    if (session.dojo) {
        const [students, instructors, managers] = await Promise.all([
            prisma.student.findMany({
                where: {
                    dojoId: session.dojo.id,
                    id: { not: session.userId },
                },
                orderBy: [{ onboardingComplete: "asc" }, { joinDate: "desc" }],
                include: { user: true },
            }),
            prisma.instructor.findMany({
                where: {
                    dojoId: session.dojo.id,
                    id: { not: session.userId },
                },
                orderBy: { createdAt: "desc" },
                include: { user: true },
            }),
            prisma.dojoManager.findMany({
                where: {
                    dojoId: session.dojo.id,
                    id: { not: session.userId },
                },
                orderBy: { createdAt: "desc" },
                include: { user: true },
            }),
        ]);

        for (const s of students) {
            if (s.onboardingComplete) {
                rosters.STUDENT.push({
                    id: s.id,
                    name: s.user.fullName,
                    email: s.user.email,
                    role: "STUDENT",
                    rank: s.currentRank,
                    joined: s.joinDate.toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                    }),
                    status: s.user.isActive ? "Active" : "Inactive",
                });
            } else {
                invited.STUDENT.push({
                    id: s.id,
                    name: pretty(s.user.fullName, s.user.email),
                    email: s.user.email,
                    role: "STUDENT",
                    invitedAt: relativeTime(s.user.createdAt),
                });
            }
        }

        for (const i of instructors) {
            if (i.user.isActive) {
                rosters.INSTRUCTOR.push({
                    id: i.id,
                    name: i.user.fullName,
                    email: i.user.email,
                    role: "INSTRUCTOR",
                    rank: rankFromBio(i.bio),
                    joined: i.joinedDate.toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                    }),
                    status: "Active",
                });
            } else {
                invited.INSTRUCTOR.push({
                    id: i.id,
                    name: pretty(i.user.fullName, i.user.email),
                    email: i.user.email,
                    role: "INSTRUCTOR",
                    invitedAt: relativeTime(i.user.createdAt),
                });
            }
        }

        for (const m of managers) {
            if (m.user.isActive) {
                rosters.DOJO_MANAGER.push({
                    id: m.id,
                    name: m.user.fullName,
                    email: m.user.email,
                    role: "DOJO_MANAGER",
                    rank: "—",
                    joined: m.createdAt.toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                    }),
                    status: "Active",
                });
            } else {
                invited.DOJO_MANAGER.push({
                    id: m.id,
                    name: pretty(m.user.fullName, m.user.email),
                    email: m.user.email,
                    role: "DOJO_MANAGER",
                    invitedAt: relativeTime(m.createdAt),
                });
            }
        }
    }

    const totalActive =
        rosters.STUDENT.length +
        rosters.INSTRUCTOR.length +
        rosters.DOJO_MANAGER.length;
    const totalInvited =
        invited.STUDENT.length +
        invited.INSTRUCTOR.length +
        invited.DOJO_MANAGER.length;

    const description = session.dojo
        ? dojoIsActivated
            ? `${totalActive} active ${
                  totalActive === 1 ? "member" : "members"
              } at ${session.dojo.name}${
                  totalInvited
                      ? ` · ${totalInvited} invite${
                            totalInvited === 1 ? "" : "s"
                        } pending`
                      : ""
              }.`
            : "Complete your enlistment payment to unlock invites for instructors, managers, and students."
        : "Invites unlock once your dojo is approved by the federation.";

    const inviteDisabledReason = !session.dojo
        ? "Invites unlock once your dojo is approved."
        : !dojoIsActivated
          ? "Activate your dojo (complete the enlistment payment) before inviting members."
          : undefined;

    const allInvited = [
        ...invited.STUDENT,
        ...invited.INSTRUCTOR,
        ...invited.DOJO_MANAGER,
    ];

    return (
        <>
            <DojoPageHeader
                eyebrow="Roster"
                title="Members"
                description={description}
                actions={
                    canInvite ? (
                        <InviteMemberModal
                            allowedRoles={invitableRolesFor(session.role)}
                            disabled={
                                !session.dojo ||
                                !dojoIsActivated
                            }
                            disabledReason={inviteDisabledReason}
                        />
                    ) : undefined
                }
            />

            <TabBar
                activeTab={activeTab}
                counts={{
                    students: rosters.STUDENT.length,
                    instructors: rosters.INSTRUCTOR.length,
                    managers: rosters.DOJO_MANAGER.length,
                    invited: totalInvited,
                }}
            />

            {activeTab === "invited" ? (
                <InvitedTab
                    invites={allInvited}
                    canManage={canInvite && dojoIsActivated}
                />
            ) : (
                <RosterTab
                    members={
                        activeTab === "students"
                            ? rosters.STUDENT
                            : activeTab === "instructors"
                              ? rosters.INSTRUCTOR
                              : rosters.DOJO_MANAGER
                    }
                    label={
                        activeTab === "students"
                            ? "students"
                            : activeTab === "instructors"
                              ? "instructors"
                              : "managers"
                    }
                    canInvite={canInvite}
                    hasDojo={!!session.dojo}
                    dojoIsActivated={dojoIsActivated}
                />
            )}
        </>
    );
}

function TabBar({
    activeTab,
    counts,
}: {
    activeTab: TabId;
    counts: {
        students: number;
        instructors: number;
        managers: number;
        invited: number;
    };
}) {
    return (
        <nav
            aria-label="Roster tabs"
            className="mb-6 border-b border-zinc-200 flex flex-wrap gap-1"
        >
            {ROSTER_TABS.map((t) => {
                const isActive = activeTab === t.id;
                const count = counts[t.id];
                return (
                    <Link
                        key={t.id}
                        href={`/portal/dojo/members?tab=${t.id}`}
                        scroll={false}
                        className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-widest uppercase border-b-2 -mb-px transition-colors ${
                            isActive
                                ? "border-accent-red text-accent-red"
                                : "border-transparent text-zinc-500 hover:text-zinc-900"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {t.label}
                        <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                                isActive
                                    ? "bg-accent-red/10 text-accent-red"
                                    : "bg-zinc-100 text-zinc-500"
                            }`}
                        >
                            {count}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

function RosterTab({
    members,
    label,
    canInvite,
    hasDojo,
    dojoIsActivated,
}: {
    members: RosterMember[];
    label: string;
    canInvite: boolean;
    hasDojo: boolean;
    dojoIsActivated: boolean;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-3">
                <Search size={16} className="text-zinc-400" />
                <input
                    type="text"
                    placeholder={`Search ${label}…`}
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                />
            </div>
            {members.length === 0 ? (
                <EmptyState
                    label={label}
                    canInvite={canInvite}
                    hasDojo={hasDojo}
                    dojoIsActivated={dojoIsActivated}
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                <th className="px-5 py-3">Name</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3">Rank</th>
                                <th className="px-5 py-3">Joined</th>
                                <th className="px-5 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m) => (
                                <tr
                                    key={m.id}
                                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                >
                                    <td className="px-5 py-3 font-semibold text-zinc-900">
                                        <Link
                                            href={`/portal/dojo/members/${m.id}`}
                                            className="hover:text-accent-red"
                                        >
                                            {m.name}
                                        </Link>
                                        <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                                            {m.email}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <RoleBadge role={m.role} />
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {m.rank}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-500">
                                        {m.joined}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full ${
                                                m.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                            }`}
                                        >
                                            {m.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function InvitedTab({
    invites,
    canManage,
}: {
    invites: PendingInvite[];
    canManage: boolean;
}) {
    if (invites.length === 0) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-10 text-center text-zinc-500">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                    <Mail size={20} />
                </div>
                <p className="text-sm font-semibold text-zinc-700 mb-1">
                    No pending invites
                </p>
                <p className="text-xs leading-relaxed max-w-sm mx-auto">
                    All invitees have activated their accounts. Send new invites
                    to grow the roster.
                </p>
            </div>
        );
    }

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                    Pending invites
                </p>
                <h3 className="font-serif text-base font-bold text-zinc-900">
                    Waiting on activation
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                    Resend to send a fresh email — the previous link stops
                    working once a new one is issued.
                </p>
            </header>
            <ul className="divide-y divide-zinc-100">
                {invites.map((inv) => (
                    <li
                        key={inv.id}
                        className="px-5 py-4 flex items-center gap-4 flex-wrap"
                    >
                        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                            <Mail size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-zinc-900">
                                    {inv.name}
                                </p>
                                <RoleBadge role={inv.role} />
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {inv.email} · invited {inv.invitedAt}
                            </p>
                        </div>
                        {canManage && (
                            <InviteActionButtons memberId={inv.id} />
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function RoleBadge({ role }: { role: RosterRole }) {
    const label = ROLE_LABEL[role as DojoRole] ?? "Student";
    return (
        <span
            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full ${ROLE_BADGE[role]}`}
        >
            {label}
        </span>
    );
}

function EmptyState({
    label,
    canInvite,
    hasDojo,
    dojoIsActivated,
}: {
    label: string;
    canInvite: boolean;
    hasDojo: boolean;
    dojoIsActivated: boolean;
}) {
    return (
        <div className="p-10 text-center text-zinc-500">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                <UserRound size={20} />
            </div>
            <p className="text-sm font-semibold text-zinc-700 mb-1">
                No {label} yet
            </p>
            <p className="text-xs leading-relaxed max-w-sm mx-auto">
                {canInvite
                    ? hasDojo
                        ? dojoIsActivated
                            ? `Use the Invite member button to add your first ${label.replace(
                                  /s$/,
                                  ""
                              )}.`
                            : `Activate your dojo (complete the enlistment payment) to invite ${label}.`
                        : `You'll be able to invite ${label} once the federation approves your dojo.`
                    : `Ask a Manager or the Dojo Head to invite ${label}.`}
            </p>
        </div>
    );
}

function pretty(name: string, email: string) {
    if (name && name !== email) return name;
    return email.split("@")[0];
}

function rankFromBio(bio: string | null): string {
    if (!bio) return "—";
    const match = /Rank:\s*(.+)/i.exec(bio);
    return match?.[1]?.trim() || "—";
}

function relativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export const dynamic = "force-dynamic";
