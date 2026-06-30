import type { Metadata } from "next";
import Link from "next/link";
import {
    Mail,
    RotateCcw,
    Search,
    Trash2,
    UserRound,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import InviteMemberModal from "@/components/dojo/invite-member-modal";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { resendInvite, revokeInvite } from "./actions";
import { hasAtLeast, ROLE_LABEL, type DojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Members — Dojo Dashboard",
};

type RosterMember = {
    id: string;
    name: string;
    email: string;
    role: DojoRole | "STUDENT";
    rank: string;
    joined: string;
    status: "Active" | "Inactive";
};

type PendingInvite = {
    id: string;
    name: string;
    email: string;
    role: DojoRole | "STUDENT";
    invitedAt: string;
};

const ROLE_BADGE: Record<RosterMember["role"], string> = {
    STUDENT: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    INSTRUCTOR: "bg-sky-50 text-sky-800 border border-sky-200",
    DOJO_MANAGER: "bg-amber-50 text-amber-800 border border-amber-200",
    DOJO_OWNER: "bg-accent-red/10 text-accent-red border border-accent-red/30",
};

export default async function StudentsPage() {
    const session = await requireDojoRole("INSTRUCTOR");
    const canInvite = hasAtLeast(session.role, "DOJO_OWNER");

    let activeMembers: RosterMember[] = [];
    let pendingInvites: PendingInvite[] = [];

    if (session.dojo) {
        const rows = await prisma.member.findMany({
            where: { dojoId: session.dojo.id, id: { not: session.userId } },
            orderBy: [{ onboardingComplete: "asc" }, { joinDate: "desc" }],
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                currentRank: true,
                joinDate: true,
                isActive: true,
                onboardingComplete: true,
                createdAt: true,
            },
        });

        activeMembers = rows
            .filter((m) => m.onboardingComplete)
            .map((m) => ({
                id: m.id,
                name: m.fullName,
                email: m.email,
                role: m.role as RosterMember["role"],
                rank: m.currentRank,
                joined: m.joinDate.toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                }),
                status: m.isActive ? "Active" : "Inactive",
            }));

        pendingInvites = rows
            .filter((m) => !m.onboardingComplete)
            .map((m) => ({
                id: m.id,
                name:
                    m.fullName && m.fullName !== m.email
                        ? m.fullName
                        : m.email.split("@")[0],
                email: m.email,
                role: m.role as RosterMember["role"],
                invitedAt: relativeTime(m.createdAt),
            }));
    }

    const description = session.dojo
        ? `${activeMembers.length} active ${
              activeMembers.length === 1 ? "member" : "members"
          } at ${session.dojo.name}${
              pendingInvites.length
                  ? ` · ${pendingInvites.length} invite${
                        pendingInvites.length === 1 ? "" : "s"
                    } pending`
                  : ""
          }.`
        : "Invites unlock once your dojo is approved by the federation.";

    return (
        <>
            <DojoPageHeader
                eyebrow="Roster"
                title="Members"
                description={description}
                actions={
                    canInvite ? (
                        <InviteMemberModal
                            disabled={!session.dojo}
                            disabledReason="Invites unlock once your dojo is approved."
                        />
                    ) : undefined
                }
            />

            {pendingInvites.length > 0 && (
                <section className="mb-6 bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <header className="px-5 py-4 border-b border-zinc-200">
                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                            Pending invites
                        </p>
                        <h3 className="font-serif text-base font-bold text-zinc-900">
                            Waiting on activation
                        </h3>
                    </header>
                    <ul className="divide-y divide-zinc-100">
                        {pendingInvites.map((inv) => (
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
                                {canInvite && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <form action={resendInvite}>
                                            <input
                                                type="hidden"
                                                name="memberId"
                                                value={inv.id}
                                            />
                                            <button
                                                type="submit"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-zinc-600 hover:text-accent-red transition-colors px-3 py-2"
                                            >
                                                <RotateCcw size={12} />
                                                Resend
                                            </button>
                                        </form>
                                        <form action={revokeInvite}>
                                            <input
                                                type="hidden"
                                                name="memberId"
                                                value={inv.id}
                                            />
                                            <button
                                                type="submit"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors px-3 py-2"
                                            >
                                                <Trash2 size={12} />
                                                Revoke
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-3">
                    <Search size={16} className="text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by name, rank, or status…"
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                    />
                </div>
                {activeMembers.length === 0 ? (
                    <EmptyState canInvite={canInvite} hasDojo={!!session.dojo} />
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
                                {activeMembers.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                    >
                                        <td className="px-5 py-3 font-semibold text-zinc-900">
                                            <Link
                                                href={`/portal/dojo/students/${m.id}`}
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
        </>
    );
}

function RoleBadge({ role }: { role: RosterMember["role"] }) {
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
    canInvite,
    hasDojo,
}: {
    canInvite: boolean;
    hasDojo: boolean;
}) {
    return (
        <div className="p-10 text-center text-zinc-500">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                <UserRound size={20} />
            </div>
            <p className="text-sm font-semibold text-zinc-700 mb-1">
                No active members yet
            </p>
            <p className="text-xs leading-relaxed max-w-sm mx-auto">
                {canInvite
                    ? hasDojo
                        ? "Use the Invite member button to add your first student or instructor."
                        : "You'll be able to invite members once the federation approves your dojo."
                    : "Ask your Dojo Head to invite the first members."}
            </p>
        </div>
    );
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
