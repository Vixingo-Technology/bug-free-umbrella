"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { inviteDojoMemberAction } from "@/app/actions/dojo-invite";
import { BELT_RANKS_ORDERED } from "@/lib/constants";
import { DOJO_STAFF_LIMIT } from "@/lib/dojo-roles";

type Role = "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER";

const ROLE_OPTIONS: Record<
    Role,
    { label: string; hint: string }
> = {
    STUDENT: {
        label: "Student",
        hint: "Trains at the dojo, gets graded, joins events.",
    },
    INSTRUCTOR: {
        label: "Instructor",
        hint: "Runs classes, takes attendance, grades students.",
    },
    DOJO_MANAGER: {
        label: "Manager",
        hint: "Handles renewals, billing, and roster admin.",
    },
};

type Props = {
    /** Roles the current staff member is allowed to invite. Order determines
     *  the default selection (first item). */
    allowedRoles: Role[];
    /** Current instructors + managers in the dojo (activated + pending). */
    staffCount: number;
    disabled?: boolean;
    disabledReason?: string;
};

export default function InviteMemberModal({
    allowedRoles,
    staffCount,
    disabled = false,
    disabledReason,
}: Props) {
    const staffSlotsLeft = Math.max(0, DOJO_STAFF_LIMIT - staffCount);
    const staffFull = staffSlotsLeft === 0;
    const effectiveRoles = staffFull
        ? allowedRoles.filter((r) => r === "STUDENT")
        : allowedRoles;
    const defaultRole = effectiveRoles[0] ?? allowedRoles[0] ?? "STUDENT";
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [rank, setRank] = useState("");
    const [role, setRole] = useState<Role>(defaultRole);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function reset() {
        setEmail("");
        setFullName("");
        setRank("");
        setRole(defaultRole);
        setError(null);
        setSuccess(null);
    }

    function close() {
        if (isPending) return;
        setOpen(false);
        reset();
    }

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const form = new FormData();
        form.set("email", email);
        form.set("fullName", fullName);
        form.set("rank", rank);
        form.set("role", role);

        startTransition(async () => {
            const result = await inviteDojoMemberAction(form);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setSuccess(`Invitation sent to ${email}.`);
            setEmail("");
            setFullName("");
            setRank("");
            setRole(defaultRole);
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => !disabled && setOpen(true)}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
                <Plus size={14} />
                Invite member
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="invite-modal-title"
                    onClick={close}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-zinc-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-200">
                            <div>
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                    Dojo roster
                                </p>
                                <h2
                                    id="invite-modal-title"
                                    className="font-serif text-lg font-bold text-zinc-900"
                                >
                                    Invite a new member
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                className="text-zinc-400 hover:text-zinc-700 transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="invite-email"
                                    className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5"
                                >
                                    Email
                                </label>
                                <input
                                    id="invite-email"
                                    type="email"
                                    required
                                    autoComplete="off"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isPending}
                                    placeholder="name@example.com"
                                    className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red disabled:opacity-60"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="invite-name"
                                    className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5"
                                >
                                    Full name{" "}
                                    <span className="text-zinc-400 font-normal normal-case tracking-normal">
                                        (optional)
                                    </span>
                                </label>
                                <input
                                    id="invite-name"
                                    type="text"
                                    autoComplete="off"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    disabled={isPending}
                                    placeholder="They can fill this in themselves later"
                                    className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red disabled:opacity-60"
                                />
                            </div>

                            {(role === "INSTRUCTOR" || role === "STUDENT") && (
                                <div>
                                    <label
                                        htmlFor="invite-rank"
                                        className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5"
                                    >
                                        Belt rank{" "}
                                        <span className="text-zinc-400 font-normal normal-case tracking-normal">
                                            (optional)
                                        </span>
                                    </label>
                                    <select
                                        id="invite-rank"
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        disabled={isPending}
                                        className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red disabled:opacity-60"
                                    >
                                        <option value="">Not set</option>
                                        {BELT_RANKS_ORDERED.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                        Role
                                    </p>
                                    {allowedRoles.some(
                                        (r) => r !== "STUDENT"
                                    ) && (
                                        <p
                                            className={`text-[10px] tracking-widest uppercase font-bold ${
                                                staffFull
                                                    ? "text-accent-red"
                                                    : "text-zinc-500"
                                            }`}
                                        >
                                            Staff {staffCount}/
                                            {DOJO_STAFF_LIMIT}
                                        </p>
                                    )}
                                </div>
                                {staffFull &&
                                    allowedRoles.some(
                                        (r) => r !== "STUDENT"
                                    ) && (
                                        <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                                            Your dojo has reached the{" "}
                                            {DOJO_STAFF_LIMIT}-staff limit.
                                            Revoke a pending invite or remove a
                                            staff member before inviting another
                                            instructor or manager. Students
                                            remain unlimited.
                                        </p>
                                    )}
                                <div className="space-y-2">
                                    {effectiveRoles.map((value) => {
                                        const opt = ROLE_OPTIONS[value];
                                        const active = role === value;
                                        return (
                                            <label
                                                key={value}
                                                className={`flex items-start gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${
                                                    active
                                                        ? "border-accent-red ring-1 ring-accent-red bg-accent-red/5"
                                                        : "border-zinc-200 hover:border-zinc-300"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="invite-role"
                                                    value={value}
                                                    checked={active}
                                                    onChange={() =>
                                                        setRole(value)
                                                    }
                                                    disabled={isPending}
                                                    className="mt-1 accent-accent-red"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-zinc-900">
                                                        {opt.label}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                                                        {opt.hint}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-sm p-3"
                                >
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div
                                    role="status"
                                    className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-sm p-3"
                                >
                                    <CheckCircle2
                                        size={16}
                                        className="shrink-0 mt-0.5"
                                    />
                                    <span>{success}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={close}
                                    disabled={isPending}
                                    className="text-xs font-bold tracking-widest uppercase text-zinc-600 hover:text-zinc-900 disabled:opacity-60 px-3 py-2.5"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !email}
                                    className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors rounded-sm"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2
                                                size={14}
                                                className="animate-spin"
                                            />
                                            Sending
                                        </>
                                    ) : (
                                        <>Send invite</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
