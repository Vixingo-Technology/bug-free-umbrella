"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus, Search, Mail, Shield, ShieldCheck, ShieldOff, X, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import {
    inviteMemberAction,
    updateMemberRoleAction,
    updateMemberStatusAction,
    resendInviteAction,
} from "@/app/actions/admin-members";

type Role = "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";
type Status = "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED";

const ROLE_LABELS: Record<Role, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Dojo Manager",
    DOJO_OWNER: "Dojo Owner",
    ADMIN: "Admin",
};

const ROLE_VALUES: Role[] = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"];

type Member = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: Role;
    membershipStatus: Status;
    currentRank: string;
    memberNumber: string | null;
    onboardingComplete: boolean;
    createdAt: string | Date;
    dojo: { id: string; name: string } | null;
};

const roleStyles: Record<Role, string> = {
    ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
    DOJO_OWNER: "bg-purple-50 text-purple-700 border-purple-200",
    DOJO_MANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200",
    INSTRUCTOR: "bg-blue-50 text-blue-700 border-blue-200",
    STUDENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusStyles: Record<Status, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    EXPIRED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

export default function MembersAdminClient({ members }: { members: Member[] }) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members.filter((m) => {
            if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
            if (statusFilter !== "ALL" && m.membershipStatus !== statusFilter) return false;
            if (!q) return true;
            return (
                m.fullName.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                (m.phone ?? "").toLowerCase().includes(q) ||
                (m.memberNumber ?? "").toLowerCase().includes(q)
            );
        });
    }, [members, search, roleFilter, statusFilter]);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {filtered.length} of {members.length} members
                    </p>
                </div>
                <button
                    onClick={() => setInviteOpen(true)}
                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                    <UserPlus size={16} />
                    Invite Member
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, phone, member #…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <Select
                    value={roleFilter}
                    onChange={(v) => setRoleFilter(v as "ALL" | Role)}
                    options={[
                        { v: "ALL", l: "All roles" },
                        ...ROLE_VALUES.map((r) => ({ v: r, l: ROLE_LABELS[r] })),
                    ]}
                />
                <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as "ALL" | Status)}
                    options={[
                        { v: "ALL", l: "All statuses" },
                        { v: "ACTIVE", l: "Active" },
                        { v: "PENDING", l: "Pending" },
                        { v: "EXPIRED", l: "Expired" },
                        { v: "SUSPENDED", l: "Suspended" },
                    ]}
                />
            </div>

            {/* Table */}
            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-100">
                            <tr className="text-left text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                                <th className="px-5 py-3">Member</th>
                                <th className="px-5 py-3">Dojo / Rank</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filtered.map((m) => (
                                <Row key={m.id} member={m} onFlash={flash} />
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-400">
                                        No members match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite modal */}
            {inviteOpen && (
                <InviteModal
                    onClose={() => setInviteOpen(false)}
                    onFlash={flash}
                />
            )}

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.kind === "ok"
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600 text-white"
                    }`}
                >
                    {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );

    // helpers below are JSX components used by render; keep declarations after return scope
}

function Select({
    value, onChange, options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { v: string; l: string }[];
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[160px]"
            >
                {options.map((o) => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
    );
}

function Row({ member, onFlash }: { member: Member; onFlash: (k: "ok" | "err", m: string) => void }) {
    const [isPending, startTransition] = useTransition();
    const [role, setRole] = useState<Role>(member.role);
    const [status, setStatus] = useState<Status>(member.membershipStatus);

    function changeRole(next: Role) {
        if (next === role) return;
        const fd = new FormData();
        fd.set("memberId", member.id);
        fd.set("role", next);
        startTransition(async () => {
            const res = await updateMemberRoleAction(fd);
            if (res.ok) {
                setRole(next);
                onFlash("ok", `Role changed to ${ROLE_LABELS[next]}.`);
            } else {
                onFlash("err", res.error);
            }
        });
    }

    function changeStatus(next: Status) {
        if (next === status) return;
        const fd = new FormData();
        fd.set("memberId", member.id);
        fd.set("status", next);
        startTransition(async () => {
            const res = await updateMemberStatusAction(fd);
            if (res.ok) {
                setStatus(next);
                onFlash("ok", `Member ${next.toLowerCase()}.`);
            } else {
                onFlash("err", res.error);
            }
        });
    }

    function resend() {
        const fd = new FormData();
        fd.set("email", member.email);
        startTransition(async () => {
            const res = await resendInviteAction(fd);
            if (res.ok) onFlash("ok", "Invite resent.");
            else onFlash("err", res.error);
        });
    }

    const initial = member.fullName.charAt(0).toUpperCase();
    const isInvitePending = !member.onboardingComplete && member.membershipStatus === "PENDING";

    return (
        <tr className={`hover:bg-zinc-50/60 transition-colors ${isPending ? "opacity-60" : ""}`}>
            <td className="px-5 py-4">
                <Link
                    href={`/portal/admin/members/${member.id}`}
                    className="flex items-center gap-3 min-w-[220px] group"
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {initial}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                            {member.fullName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                        {member.memberNumber && (
                            <p className="text-[10px] text-zinc-400 mt-0.5">#{member.memberNumber}</p>
                        )}
                    </div>
                </Link>
            </td>
            <td className="px-5 py-4 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">{member.dojo?.name ?? "—"}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{member.currentRank}</p>
            </td>
            <td className="px-5 py-4">
                <InlineSelect
                    value={role}
                    onChange={(v) => changeRole(v as Role)}
                    options={ROLE_VALUES.map((r) => ({ v: r, l: ROLE_LABELS[r] }))}
                    badgeClass={roleStyles[role]}
                />
            </td>
            <td className="px-5 py-4">
                <InlineSelect
                    value={status}
                    onChange={(v) => changeStatus(v as Status)}
                    options={[
                        { v: "ACTIVE", l: "Active" },
                        { v: "PENDING", l: "Pending" },
                        { v: "EXPIRED", l: "Expired" },
                        { v: "SUSPENDED", l: "Suspended" },
                    ]}
                    badgeClass={statusStyles[status]}
                />
            </td>
            <td className="px-5 py-4 text-right">
                <div className="inline-flex items-center gap-2">
                    {isInvitePending && (
                        <button
                            onClick={resend}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                            <Mail size={12} /> Resend
                        </button>
                    )}
                    {status === "SUSPENDED" ? (
                        <button
                            onClick={() => changeStatus("ACTIVE")}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                            <ShieldCheck size={12} /> Reactivate
                        </button>
                    ) : (
                        <button
                            onClick={() => changeStatus("SUSPENDED")}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                            <ShieldOff size={12} /> Suspend
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function InlineSelect({
    value, onChange, options, badgeClass,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { v: string; l: string }[];
    badgeClass: string;
}) {
    return (
        <div className="relative inline-block">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`appearance-none pl-2.5 pr-7 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red/30 ${badgeClass}`}
            >
                {options.map((o) => (
                    <option key={o.v} value={o.v} className="bg-white text-zinc-900 normal-case tracking-normal text-xs">
                        {o.l}
                    </option>
                ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
        </div>
    );
}

function InviteModal({ onClose, onFlash }: { onClose: () => void; onFlash: (k: "ok" | "err", m: string) => void }) {
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<Role>("STUDENT");

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        fd.set("email", email);
        fd.set("fullName", fullName);
        fd.set("role", role);
        startTransition(async () => {
            const res = await inviteMemberAction(fd);
            if (res.ok) {
                onFlash("ok", "Invite sent. The member will receive an email.");
                onClose();
            } else {
                onFlash("err", res.error);
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-red/10 rounded-xl">
                            <UserPlus size={18} className="text-accent-red" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900">Invite a new member</h2>
                            <p className="text-xs text-zinc-500">They&rsquo;ll receive an email to set their password.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="member@example.com"
                            className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">Full name (optional)</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLE_VALUES.map((r, i) => (
                                <button
                                    type="button"
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                                        i === ROLE_VALUES.length - 1 ? "col-span-2" : ""
                                    } ${
                                        role === r
                                            ? "border-accent-red bg-accent-red/5 text-accent-red"
                                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                                    }`}
                                >
                                    <Shield size={14} />
                                    {ROLE_LABELS[r]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !email}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                        >
                            {isPending ? "Sending…" : "Send Invite"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
