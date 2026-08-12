"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus, Search, Mail, Shield, ShieldCheck, ShieldOff, X, CheckCircle2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from "lucide-react";
import {
    inviteMemberAction,
    updateMemberRoleAction,
    updateMemberStatusAction,
    resendInviteAction,
    deleteMemberAction,
    resetUserPasswordAction,
} from "@/app/actions/admin-members";
import ResetPasswordButton from "@/components/auth/reset-password-button";
import { displayEmail } from "@/lib/format/email";

type Role = "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";
type Status =
    | "ACTIVE"
    | "PENDING"
    | "EXPIRED"
    | "SUSPENDED"
    | "UNPAID"
    | "AWAITING_APPROVAL"
    | "REJECTED";

const ROLE_LABELS: Record<Role, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Dojo Manager",
    DOJO_OWNER: "Dojo Owner",
    ADMIN: "Admin",
};

const STATUS_LABELS: Record<Status, string> = {
    ACTIVE: "Active",
    PENDING: "Pending",
    EXPIRED: "Expired",
    SUSPENDED: "Suspended",
    UNPAID: "Unpaid",
    AWAITING_APPROVAL: "Awaiting Approval",
    REJECTED: "Rejected",
};

// Admins can only switch a member between Instructor and Dojo Manager.
// Promoting to/from STUDENT would destroy grading history (cascade delete),
// DOJO_OWNER is set via the dojo enlistment flow (not swappable here), and
// ADMIN promotion is a federation-level decision handled elsewhere.
const CHANGEABLE_ROLE_VALUES: Role[] = ["INSTRUCTOR", "DOJO_MANAGER"];

// Admins can only issue federation-level invites. Instructor / Manager /
// Student invites are the Dojo Owner's job, from inside their dojo panel.
const INVITABLE_ROLES: Role[] = ["DOJO_OWNER", "ADMIN"];

type Member = {
    id: string;
    fullName: string;
    email: string;
    contactEmail: string | null;
    phone: string | null;
    role: Role;
    status: Status;
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
    UNPAID: "bg-amber-50 text-amber-700 border-amber-200",
    AWAITING_APPROVAL: "bg-blue-50 text-blue-700 border-blue-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
};

type Tab = "ALL" | Role;

const TABS: Tab[] = ["ALL", "STUDENT", "INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"];

const TAB_LABELS: Record<Tab, string> = {
    ALL: "All",
    STUDENT: "Students",
    INSTRUCTOR: "Instructors",
    DOJO_MANAGER: "Managers",
    DOJO_OWNER: "Dojo Owners",
    ADMIN: "Admins",
};

// Status filter options available per tab.
function statusOptionsForTab(tab: Tab): { v: "ALL" | Status; l: string }[] {
    if (tab === "STUDENT") {
        return [
            { v: "ALL", l: "All statuses" },
            { v: "ACTIVE", l: "Active" },
            { v: "PENDING", l: "Pending" },
            { v: "EXPIRED", l: "Expired" },
            { v: "SUSPENDED", l: "Suspended" },
        ];
    }
    if (tab === "DOJO_OWNER") {
        return [
            { v: "ALL", l: "All statuses" },
            { v: "ACTIVE", l: "Active" },
            { v: "UNPAID", l: "Unpaid" },
            { v: "AWAITING_APPROVAL", l: "Awaiting Approval" },
            { v: "REJECTED", l: "Rejected" },
            { v: "SUSPENDED", l: "Suspended" },
        ];
    }
    // Staff & admin (and mixed "ALL") — just active / suspended is meaningful.
    return [
        { v: "ALL", l: "All statuses" },
        { v: "ACTIVE", l: "Active" },
        { v: "SUSPENDED", l: "Suspended" },
    ];
}

const PAGE_SIZE = 25;

export default function MembersAdminClient({ members }: { members: Member[] }) {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<Tab>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [page, setPage] = useState(1);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    // Per-tab counts (independent of search / status).
    const tabCounts = useMemo(() => {
        const counts: Record<Tab, number> = {
            ALL: members.length,
            STUDENT: 0,
            INSTRUCTOR: 0,
            DOJO_MANAGER: 0,
            DOJO_OWNER: 0,
            ADMIN: 0,
        };
        for (const m of members) counts[m.role]++;
        return counts;
    }, [members]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members.filter((m) => {
            if (tab !== "ALL" && m.role !== tab) return false;
            if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
            if (!q) return true;
            return (
                m.fullName.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                (m.contactEmail ?? "").toLowerCase().includes(q) ||
                (m.phone ?? "").toLowerCase().includes(q) ||
                (m.memberNumber ?? "").toLowerCase().includes(q)
            );
        });
    }, [members, search, tab, statusFilter]);

    // Reset to page 1 whenever filters change.
    useEffect(() => {
        setPage(1);
    }, [search, tab, statusFilter]);

    // Reset status filter when switching to a tab that doesn't offer it.
    useEffect(() => {
        const allowed = statusOptionsForTab(tab).map((o) => o.v);
        if (!allowed.includes(statusFilter)) setStatusFilter("ALL");
    }, [tab, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const pageStart = (clampedPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Members</h1>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                        {filtered.length} of {members.length} members
                    </p>
                </div>
                <button
                    onClick={() => setInviteOpen(true)}
                    className="inline-flex items-center justify-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all w-full sm:w-auto"
                >
                    <UserPlus size={16} />
                    Invite Member
                </button>
            </div>

            {/* Role tabs */}
            <div className="mb-4 border-b border-zinc-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="flex items-center gap-1 min-w-max">
                    {TABS.map((t) => {
                        const isActive = tab === t;
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                                    isActive
                                        ? "border-accent-red text-accent-red"
                                        : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                                }`}
                            >
                                {TAB_LABELS[t]}
                                <span
                                    className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full ${
                                        isActive
                                            ? "bg-accent-red/10 text-accent-red"
                                            : "bg-zinc-100 text-zinc-500"
                                    }`}
                                >
                                    {tabCounts[t]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 sm:mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, phone…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as "ALL" | Status)}
                    options={statusOptionsForTab(tab)}
                />
            </div>

            {/* Desktop table */}
            <div className="hidden xl:block bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
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
                            {pageRows.map((m) => (
                                <Row key={m.id} member={m} onFlash={flash} />
                            ))}
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-400">
                                        No members match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <Pagination
                        page={clampedPage}
                        totalPages={totalPages}
                        pageStart={pageStart}
                        pageEnd={Math.min(pageStart + PAGE_SIZE, filtered.length)}
                        total={filtered.length}
                        onChange={setPage}
                    />
                )}
            </div>

            {/* Mobile / tablet / narrow-desktop cards */}
            <div className="xl:hidden space-y-3">
                {pageRows.map((m) => (
                    <MobileCard key={m.id} member={m} onFlash={flash} />
                ))}
                {pageRows.length === 0 && (
                    <div className="bg-white border border-zinc-100 rounded-2xl px-5 py-12 text-center text-sm text-zinc-400 shadow-sm">
                        No members match the current filters.
                    </div>
                )}
                {filtered.length > 0 && (
                    <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                        <Pagination
                            page={clampedPage}
                            totalPages={totalPages}
                            pageStart={pageStart}
                            pageEnd={Math.min(pageStart + PAGE_SIZE, filtered.length)}
                            total={filtered.length}
                            onChange={setPage}
                        />
                    </div>
                )}
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
}

function Pagination({
    page, totalPages, pageStart, pageEnd, total, onChange,
}: {
    page: number;
    totalPages: number;
    pageStart: number;
    pageEnd: number;
    total: number;
    onChange: (p: number) => void;
}) {
    const canPrev = page > 1;
    const canNext = page < totalPages;

    // Compact page-number list: first, current-1..current+1, last, with ellipses.
    const pages: (number | "…")[] = [];
    const add = (v: number | "…") => {
        if (pages[pages.length - 1] !== v) pages.push(v);
    };
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
            add(p);
        } else if (pages[pages.length - 1] !== "…") {
            add("…");
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 text-xs text-zinc-600">
            <p>
                Showing <span className="font-semibold text-zinc-900">{pageStart + 1}</span>–
                <span className="font-semibold text-zinc-900">{pageEnd}</span> of{" "}
                <span className="font-semibold text-zinc-900">{total}</span>
            </p>
            <div className="flex items-center gap-1 flex-wrap">
                <button
                    onClick={() => canPrev && onChange(page - 1)}
                    disabled={!canPrev}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`e${i}`} className="px-2 text-zinc-400">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`min-w-[28px] px-2 py-1 rounded-lg text-xs font-semibold border ${
                                p === page
                                    ? "bg-accent-red text-white border-accent-red"
                                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            }`}
                        >
                            {p}
                        </button>
                    ),
                )}
                <button
                    onClick={() => canNext && onChange(page + 1)}
                    disabled={!canNext}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200"
                    aria-label="Next page"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
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
                className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[180px]"
            >
                {options.map((o) => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
    );
}

// Statuses the admin can toggle a student between via the inline dropdown.
const STUDENT_STATUS_CHOICES: Status[] = ["ACTIVE", "PENDING", "EXPIRED", "SUSPENDED"];

function Row({ member, onFlash }: { member: Member; onFlash: (k: "ok" | "err", m: string) => void }) {
    const [isPending, startTransition] = useTransition();
    const [role, setRole] = useState<Role>(member.role);
    const [status, setStatus] = useState<Status>(member.status);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleted, setDeleted] = useState(false);

    function performDelete() {
        const fd = new FormData();
        fd.set("memberId", member.id);
        startTransition(async () => {
            const res = await deleteMemberAction(fd);
            if (res.ok) {
                setConfirmDelete(false);
                setDeleted(true);
                onFlash("ok", `${member.fullName} was permanently deleted.`);
            } else {
                onFlash("err", res.error);
            }
        });
    }

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
                onFlash("ok", `Member ${STATUS_LABELS[next].toLowerCase()}.`);
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
    // Only students have the "invite pending onboarding" state.
    const isInvitePending =
        role === "STUDENT" && !member.onboardingComplete && status === "PENDING";

    // Status control varies by role.
    //   STUDENT → full inline dropdown (Active/Pending/Expired/Suspended).
    //   DOJO_OWNER awaiting app → read-only badge (fee/approval is the source of truth).
    //   STAFF / ADMIN / approved DOJO_OWNER → Active ↔ Suspended toggle only.
    const isReadOnlyStatus =
        role === "DOJO_OWNER" &&
        (status === "UNPAID" || status === "AWAITING_APPROVAL" || status === "REJECTED");

    if (deleted) return null;

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
                        {member.memberNumber && (
                            <p className="text-xs text-zinc-500 mt-0.5">#{member.memberNumber}</p>
                        )}
                    </div>
                </Link>
            </td>
            <td className="px-5 py-4 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">{member.dojo?.name ?? "—"}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                    {role === "STUDENT" ? member.currentRank : "—"}
                </p>
            </td>
            <td className="px-5 py-4">
                <InlineSelect
                    value={role}
                    onChange={(v) => changeRole(v as Role)}
                    options={CHANGEABLE_ROLE_VALUES.map((r) => ({ v: r, l: ROLE_LABELS[r] }))}
                    badgeClass={roleStyles[role]}
                    disabled={
                        role === "STUDENT" ||
                        role === "ADMIN" ||
                        role === "DOJO_OWNER"
                    }
                    disabledTitle={
                        role === "STUDENT"
                            ? "Student roles can't be changed here — it would erase their gradings, achievements and transfer history."
                            : role === "DOJO_OWNER"
                                ? "Dojo Owner roles can't be changed here — reassign via the dojo enlistment flow."
                                : "Admin roles can't be changed here."
                    }
                />
            </td>
            <td className="px-5 py-4">
                {isReadOnlyStatus ? (
                    <span
                        title="This status comes from the dojo enlistment application — resolve it from the applications queue."
                        className={`inline-flex items-center pl-2.5 pr-2.5 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-not-allowed ${statusStyles[status]}`}
                    >
                        {STATUS_LABELS[status]}
                    </span>
                ) : role === "STUDENT" ? (
                    <InlineSelect
                        value={status}
                        onChange={(v) => changeStatus(v as Status)}
                        options={STUDENT_STATUS_CHOICES.map((s) => ({ v: s, l: STATUS_LABELS[s] }))}
                        badgeClass={statusStyles[status]}
                    />
                ) : (
                    <InlineSelect
                        value={status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"}
                        onChange={(v) => changeStatus(v as Status)}
                        options={[
                            { v: "ACTIVE", l: "Active" },
                            { v: "SUSPENDED", l: "Suspended" },
                        ]}
                        badgeClass={statusStyles[status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"]}
                    />
                )}
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
                    {!isInvitePending && (
                        <ResetPasswordButton
                            variant="ghost"
                            label="Reset"
                            targetName={member.fullName}
                            targetSubtitle={`${ROLE_LABELS[member.role as Role] ?? member.role}${
                                displayEmail(member) ? ` · ${displayEmail(member)}` : ""
                            }`}
                            onConfirm={async (manual) => {
                                const fd = new FormData();
                                fd.set("userId", member.id);
                                if (manual) fd.set("manualPassword", manual);
                                const res = await resetUserPasswordAction(fd);
                                if (res.ok) onFlash("ok", "Password reset.");
                                else onFlash("err", res.error);
                                return res;
                            }}
                        />
                    )}
                    <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={isPending}
                        title="Delete member permanently"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            </td>
            {confirmDelete && (
                <DeleteConfirmModal
                    member={member}
                    isPending={isPending}
                    onCancel={() => setConfirmDelete(false)}
                    onConfirm={performDelete}
                />
            )}
        </tr>
    );
}

function MobileCard({ member, onFlash }: { member: Member; onFlash: (k: "ok" | "err", m: string) => void }) {
    const [isPending, startTransition] = useTransition();
    const [role, setRole] = useState<Role>(member.role);
    const [status, setStatus] = useState<Status>(member.status);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleted, setDeleted] = useState(false);

    function performDelete() {
        const fd = new FormData();
        fd.set("memberId", member.id);
        startTransition(async () => {
            const res = await deleteMemberAction(fd);
            if (res.ok) {
                setConfirmDelete(false);
                setDeleted(true);
                onFlash("ok", `${member.fullName} was permanently deleted.`);
            } else {
                onFlash("err", res.error);
            }
        });
    }

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
                onFlash("ok", `Member ${STATUS_LABELS[next].toLowerCase()}.`);
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
    const isInvitePending =
        role === "STUDENT" && !member.onboardingComplete && status === "PENDING";
    const isReadOnlyStatus =
        role === "DOJO_OWNER" &&
        (status === "UNPAID" || status === "AWAITING_APPROVAL" || status === "REJECTED");

    if (deleted) return null;

    return (
        <div className={`bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden ${isPending ? "opacity-60" : ""}`}>
            <div className="p-4 space-y-3">
                {/* Top: avatar + name/email */}
                <Link
                    href={`/portal/admin/members/${member.id}`}
                    className="flex items-center gap-3 group"
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                            {member.fullName}
                        </p>
                        {member.memberNumber && (
                            <p className="text-xs text-zinc-500 mt-0.5">#{member.memberNumber}</p>
                        )}
                    </div>
                </Link>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">Dojo</p>
                        <p className="font-medium text-zinc-800 truncate">{member.dojo?.name ?? "—"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">Rank</p>
                        <p className="font-medium text-zinc-800 truncate">
                            {role === "STUDENT" ? member.currentRank : "—"}
                        </p>
                    </div>
                </div>

                {/* Role + status controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <InlineSelect
                        value={role}
                        onChange={(v) => changeRole(v as Role)}
                        options={CHANGEABLE_ROLE_VALUES.map((r) => ({ v: r, l: ROLE_LABELS[r] }))}
                        badgeClass={roleStyles[role]}
                        disabled={
                            role === "STUDENT" ||
                            role === "ADMIN" ||
                            role === "DOJO_OWNER"
                        }
                        disabledTitle={
                            role === "STUDENT"
                                ? "Student roles can't be changed here — it would erase their gradings, achievements and transfer history."
                                : role === "DOJO_OWNER"
                                    ? "Dojo Owner roles can't be changed here — reassign via the dojo enlistment flow."
                                    : "Admin roles can't be changed here."
                        }
                    />
                    {isReadOnlyStatus ? (
                        <span
                            title="This status comes from the dojo enlistment application — resolve it from the applications queue."
                            className={`inline-flex items-center pl-2.5 pr-2.5 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-not-allowed ${statusStyles[status]}`}
                        >
                            {STATUS_LABELS[status]}
                        </span>
                    ) : role === "STUDENT" ? (
                        <InlineSelect
                            value={status}
                            onChange={(v) => changeStatus(v as Status)}
                            options={STUDENT_STATUS_CHOICES.map((s) => ({ v: s, l: STATUS_LABELS[s] }))}
                            badgeClass={statusStyles[status]}
                        />
                    ) : (
                        <InlineSelect
                            value={status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"}
                            onChange={(v) => changeStatus(v as Status)}
                            options={[
                                { v: "ACTIVE", l: "Active" },
                                { v: "SUSPENDED", l: "Suspended" },
                            ]}
                            badgeClass={statusStyles[status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"]}
                        />
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-zinc-100 bg-zinc-50/60">
                {isInvitePending && (
                    <button
                        onClick={resend}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200 transition-colors"
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
                {!isInvitePending && (
                    <ResetPasswordButton
                        variant="ghost"
                        label="Reset"
                        targetName={member.fullName}
                        targetSubtitle={`${ROLE_LABELS[member.role as Role] ?? member.role}${
                            displayEmail(member) ? ` · ${displayEmail(member)}` : ""
                        }`}
                        onConfirm={async (manual) => {
                            const fd = new FormData();
                            fd.set("userId", member.id);
                            if (manual) fd.set("manualPassword", manual);
                            const res = await resetUserPasswordAction(fd);
                            if (res.ok) onFlash("ok", "Password reset.");
                            else onFlash("err", res.error);
                            return res;
                        }}
                    />
                )}
                <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending}
                    title="Delete member permanently"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                >
                    <Trash2 size={12} /> Delete
                </button>
            </div>

            {confirmDelete && (
                <DeleteConfirmModal
                    member={member}
                    isPending={isPending}
                    onCancel={() => setConfirmDelete(false)}
                    onConfirm={performDelete}
                />
            )}
        </div>
    );
}

function DeleteConfirmModal({
    member, isPending, onCancel, onConfirm,
}: {
    member: Member;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const [typed, setTyped] = useState("");
    const [mounted, setMounted] = useState(false);
    const confirmPhrase = "DELETE";
    const canConfirm = typed.trim().toUpperCase() === confirmPhrase && !isPending;

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    <div className="px-6 py-5 border-b border-zinc-100 flex items-start gap-3">
                        <div className="p-2 bg-red-50 rounded-xl flex-shrink-0">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900">Delete member permanently?</h2>
                            <p className="text-xs text-zinc-500 mt-1">
                                This action is <span className="font-semibold text-red-600">irreversible</span>.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-900">
                            <p className="font-semibold">
                                You are about to permanently delete{" "}
                                <span className="underline decoration-red-400">{member.fullName}</span>{" "}
                                <span className="text-red-700">({displayEmail(member) || member.email})</span>.
                            </p>
                            <ul className="mt-3 list-disc pl-5 space-y-1 text-xs text-red-800/90">
                                <li>Their authentication account will be removed.</li>
                                <li>All linked records (student / instructor / manager / owner / admin profile) will be deleted.</li>
                                <li>Attendance, gradings, tournament entries and other cascaded rows will be lost.</li>
                                <li>This cannot be undone — even by an admin.</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                                Type <span className="text-red-600">{confirmPhrase}</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                autoFocus
                                placeholder={confirmPhrase}
                                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 focus:bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isPending}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={!canConfirm}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                            >
                                <Trash2 size={14} />
                                {isPending ? "Deleting…" : "Delete forever"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        ),
        document.body,
    );
}

function InlineSelect({
    value, onChange, options, badgeClass, disabled, disabledTitle,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { v: string; l: string }[];
    badgeClass: string;
    disabled?: boolean;
    disabledTitle?: string;
}) {
    if (disabled) {
        const label = options.find((o) => o.v === value)?.l ?? value;
        return (
            <span
                title={disabledTitle}
                className={`inline-flex items-center pl-2.5 pr-2.5 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-not-allowed ${badgeClass}`}
            >
                {label}
            </span>
        );
    }
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
    const [role, setRole] = useState<Role>("DOJO_OWNER");

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
                            {INVITABLE_ROLES.map((r) => (
                                <button
                                    type="button"
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
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
                        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                            {role === "DOJO_OWNER"
                                ? "The owner will receive a branded invite email with the enlistment link and fee breakdown. They complete the /enlist-dojo/signup flow themselves."
                                : "The admin will receive a Supabase email to set their password and go straight to the back-office."}
                        </p>
                        <p className="mt-2 text-[11px] text-zinc-400">
                            Instructor / Manager / Student invites are issued
                            by the Dojo Owner from inside their dojo panel.
                        </p>
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
