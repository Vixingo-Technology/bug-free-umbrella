"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    Building2, Search, X, Pencil, Trash2, MapPin, Phone, Mail,
    Users, AlertCircle, CheckCircle2, ChevronDown, Power,
    Calendar, Send, Loader2, UserPlus, Copy, Check, Hash,
} from "lucide-react";
import {
    deleteDojoAction,
    sendDojoRenewalReminderAction,
} from "@/app/actions/admin-dojos";
import {
    inviteMemberAction,
    resetDojoOwnerPasswordAction,
    revokeDojoOwnerInviteAction,
} from "@/app/actions/admin-members";
import ResetPasswordButton from "@/components/auth/reset-password-button";

type DojoOwnerInvite = {
    email: string;
    fullName: string | null;
    invitedAt: string;
    acceptedAt: string | null;
    invitedByName: string | null;
};

type Dojo = {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    annualFee: number | null;
    expiryDate: string | null;
    headInstructorId: string | null;
    headInstructor: {
        id: string;
        fullName: string;
        email: string;
        memberNumber: string | null;
    } | null;
    _count: { members: number };
    lockedFeatures: string[];
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DojosAdminClient({
    dojos, invites,
}: {
    dojos: Dojo[];
    invites: DojoOwnerInvite[];
}) {
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [inviting, setInviting] = useState(false);
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return dojos.filter((d) => {
            if (activeFilter === "ACTIVE" && !d.isActive) return false;
            if (activeFilter === "INACTIVE" && d.isActive) return false;
            if (!q) return true;
            return (
                d.name.toLowerCase().includes(q) ||
                (d.city ?? "").toLowerCase().includes(q) ||
                (d.address ?? "").toLowerCase().includes(q) ||
                (d.headInstructor?.fullName ?? "").toLowerCase().includes(q)
            );
        });
    }, [dojos, search, activeFilter]);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 4000);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Dojos</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {filtered.length} of {dojos.length} dojos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/portal/admin/dojos/applications"
                        className="inline-flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm border border-zinc-200 transition-all"
                    >
                        Review applications
                    </a>
                    <button
                        onClick={() => setInviting(true)}
                        className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                        <UserPlus size={16} />
                        Invite Dojo
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, city, instructor…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <div className="relative">
                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                        className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[170px]"
                    >
                        <option value="ALL">All dojos</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
            </div>

            <InvitesPanel invites={invites} onFlash={flash} />

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((d) => (
                    <DojoCard
                        key={d.id}
                        dojo={d}
                        onFlash={flash}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No dojos match the current filters.
                    </div>
                )}
            </div>

            {inviting && (
                <InviteDojoModal
                    onClose={() => setInviting(false)}
                    onFlash={flash}
                />
            )}

            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.kind === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                >
                    {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );
}

function InvitesPanel({
    invites, onFlash,
}: {
    invites: DojoOwnerInvite[];
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);
    const pendingCount = invites.filter((i) => !i.acceptedAt).length;

    function revoke(email: string) {
        if (!confirm(`Revoke invite for ${email}?`)) return;
        const fd = new FormData();
        fd.set("email", email);
        startTransition(async () => {
            const res = await revokeDojoOwnerInviteAction(fd);
            if (res.ok) onFlash("ok", "Invite revoked.");
            else onFlash("err", res.error);
        });
    }

    if (invites.length === 0) return null;

    return (
        <div className="mb-6 bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-accent-red/10 rounded-xl">
                        <UserPlus size={16} className="text-accent-red" />
                    </div>
                    <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-zinc-900">
                            Dojo owner invites
                        </p>
                        <p className="text-xs text-zinc-500">
                            {invites.length} sent · {pendingCount} pending · {invites.length - pendingCount} accepted
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
            </button>

            {expanded && (
                <div className="border-t border-zinc-100 divide-y divide-zinc-100">
                    {invites.map((invite) => {
                        const accepted = !!invite.acceptedAt;
                        return (
                            <div
                                key={invite.email}
                                className={`flex items-center justify-between gap-3 px-5 py-3 ${isPending ? "opacity-60" : ""}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                        {invite.fullName || invite.email}
                                    </p>
                                    {invite.fullName && (
                                        <p className="text-xs text-zinc-500 truncate">
                                            {invite.email}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                        Invited {fmtDate.format(new Date(invite.invitedAt))}
                                        {invite.invitedByName && ` · by ${invite.invitedByName}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                                            accepted
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                    >
                                        {accepted ? "Accepted" : "Pending"}
                                    </span>
                                    {!accepted && (
                                        <button
                                            type="button"
                                            onClick={() => revoke(invite.email)}
                                            disabled={isPending}
                                            title="Revoke invite"
                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-100"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DojoCard({
    dojo, onFlash,
}: {
    dojo: Dojo;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (!confirm(`Delete "${dojo.name}"? This cannot be undone.`)) return;
        const fd = new FormData();
        fd.set("id", dojo.id);
        startTransition(async () => {
            const res = await deleteDojoAction(fd);
            if (res.ok) onFlash("ok", "Dojo deleted.");
            else onFlash("err", res.error);
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${isPending ? "opacity-60" : ""}`}
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-zinc-900 rounded-xl flex-shrink-0">
                            <Building2 size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-zinc-900 truncate">{dojo.name}</h3>
                            {dojo.city && (
                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                                    <MapPin size={11} /> {dojo.city}
                                </p>
                            )}
                        </div>
                    </div>

                    {!dojo.isActive ? (
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 flex items-center gap-1">
                            <Power size={9} /> Inactive
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                        </span>
                    )}
                </div>

                <DojoIdRow
                    memberId={dojo.headInstructor?.memberNumber ?? null}
                    onFlash={onFlash}
                />

                <div className="space-y-2 text-sm">
                    {dojo.address && (
                        <p className="text-xs text-zinc-600 flex items-start gap-1.5">
                            <MapPin size={11} className="mt-0.5 flex-shrink-0 text-zinc-400" />
                            <span className="line-clamp-2">{dojo.address}</span>
                        </p>
                    )}
                    {dojo.phone && (
                        <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                            <Phone size={11} className="text-zinc-400" /> {dojo.phone}
                        </p>
                    )}
                    {dojo.email && (
                        <p className="text-xs text-zinc-600 flex items-center gap-1.5 truncate">
                            <Mail size={11} className="text-zinc-400" /> {dojo.email}
                        </p>
                    )}
                    <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                        <Users size={11} className="text-zinc-400" /> {dojo._count.members} members
                    </p>
                </div>

                <ExpiryRow dojo={dojo} onFlash={onFlash} />

                {dojo.headInstructor && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">
                            Dojo Head
                        </p>
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                    {dojo.headInstructor.fullName}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    {dojo.headInstructor.email}
                                </p>
                            </div>
                            <ResetPasswordButton
                                variant="ghost"
                                label="Reset"
                                targetName={dojo.headInstructor.fullName}
                                targetSubtitle={`Dojo Head · ${dojo.name}`}
                                onConfirm={async (manual) => {
                                    const fd = new FormData();
                                    fd.set("ownerId", dojo.headInstructor!.id);
                                    if (manual) fd.set("manualPassword", manual);
                                    const res = await resetDojoOwnerPasswordAction(fd);
                                    if (res.ok) {
                                        onFlash("ok", "Password reset.");
                                    } else {
                                        onFlash("err", res.error);
                                    }
                                    return res;
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                    <Link
                        href={`/portal/admin/dojos/${dojo.id}/edit`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-3 py-2 rounded-lg transition-colors border border-zinc-200"
                    >
                        <Pencil size={12} /> Edit
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="inline-flex items-center justify-center text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}


function InviteDojoModal({
    onClose, onFlash,
}: {
    onClose: () => void;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        fd.set("email", email);
        fd.set("fullName", fullName);
        fd.set("role", "DOJO_OWNER");
        startTransition(async () => {
            const res = await inviteMemberAction(fd);
            if (res.ok) {
                onFlash("ok", "Invite sent. The dojo owner will receive an email.");
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
                            <h2 className="text-lg font-bold text-zinc-900">Invite a new dojo</h2>
                            <p className="text-xs text-zinc-500">The owner will receive an email with the enlistment link.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    <Field label="Owner email" required>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="owner@example.com"
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Owner name (optional)">
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            className={inputCls}
                        />
                    </Field>

                    <p className="text-[11px] leading-relaxed text-zinc-500">
                        The owner will receive a branded invite email with the enlistment link and fee breakdown. They complete the /enlist-dojo/signup flow themselves — creating their dojo and paying the one-time enlistment fee.
                    </p>

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

const inputCls = "w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                {label}{required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}

function DojoIdRow({
    memberId,
    onFlash,
}: {
    memberId: string | null;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        if (!memberId) return;
        try {
            await navigator.clipboard.writeText(memberId);
            setCopied(true);
            onFlash("ok", "Member ID copied.");
            setTimeout(() => setCopied(false), 1500);
        } catch {
            onFlash("err", "Could not copy Member ID.");
        }
    }

    return (
        <div className="mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
            <Hash size={11} className="text-zinc-400 shrink-0" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 shrink-0">
                Member ID
            </span>
            {memberId ? (
                <>
                    <code
                        className="text-[11px] font-mono font-semibold text-zinc-800 truncate flex-1"
                        title={memberId}
                    >
                        {memberId}
                    </code>
                    <button
                        type="button"
                        onClick={copy}
                        title="Copy Member ID"
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors shrink-0"
                    >
                        {copied ? (
                            <Check size={11} className="text-emerald-600" />
                        ) : (
                            <Copy size={11} />
                        )}
                    </button>
                </>
            ) : (
                <span className="text-[11px] italic text-zinc-400 flex-1">
                    Not assigned
                </span>
            )}
        </div>
    );
}

function ExpiryRow({
    dojo,
    onFlash,
}: {
    dojo: Dojo;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const days = daysUntil(dojo.expiryDate);
    const expiryLabel = dojo.expiryDate
        ? fmtDate.format(new Date(dojo.expiryDate))
        : "Not set";

    let tone: "ok" | "warn" | "danger" | "muted" = "muted";
    let badge = "No expiry";
    if (dojo.expiryDate) {
        if (days !== null && days < 0) {
            tone = "danger";
            badge = `Expired ${Math.abs(days)}d ago`;
        } else if (days !== null && days <= 30) {
            tone = "warn";
            badge = `${days}d left`;
        } else {
            tone = "ok";
            badge = days !== null ? `${days}d left` : "Active";
        }
    }

    const badgeCls =
        tone === "ok"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : tone === "warn"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : tone === "danger"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-zinc-50 text-zinc-500 border-zinc-200";

    function sendReminder() {
        startTransition(async () => {
            const res = await sendDojoRenewalReminderAction({ dojoId: dojo.id });
            if (res.ok) onFlash("ok", `${dojo.name} notified.`);
            else onFlash("err", res.error);
        });
    }

    return (
        <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2 flex items-center gap-1">
                <Calendar size={10} /> Membership expires
            </p>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                        {expiryLabel}
                    </p>
                    <span
                        className={`inline-block mt-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${badgeCls}`}
                    >
                        {badge}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={sendReminder}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-accent-red hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title={
                        days === null
                            ? "Notify the dojo owner to renew"
                            : days < 0
                                ? `Dojo expired ${Math.abs(days)}d ago — send reminder`
                                : `${days} days left — send reminder`
                    }
                >
                    {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Send size={12} />
                    )}
                    Send reminder
                </button>
            </div>
        </div>
    );
}
