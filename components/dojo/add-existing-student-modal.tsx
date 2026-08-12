"use client";

import { useState, useTransition } from "react";
import {
    CheckCircle2,
    Copy,
    Loader2,
    UserPlus,
    X,
} from "lucide-react";
import { createExistingStudentAction } from "@/app/actions/dojo-invite";
import { BELT_RANKS_ORDERED, formatBeltRank } from "@/lib/constants";

type Props = {
    disabled?: boolean;
    disabledReason?: string;
};

type Credentials = {
    memberNumber: string;
    temporaryPassword: string;
};

export default function AddExistingStudentModal({
    disabled = false,
    disabledReason,
}: Props) {
    const [open, setOpen] = useState(false);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [currentRank, setCurrentRank] = useState<string>(BELT_RANKS_ORDERED[0]);
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Credentials | null>(null);
    const [copied, setCopied] = useState<"id" | "password" | null>(null);
    const [isPending, startTransition] = useTransition();

    function reset() {
        setFullName("");
        setPhone("");
        setCurrentRank(BELT_RANKS_ORDERED[0]);
        setDateOfBirth("");
        setExpiryDate("");
        setError(null);
        setCredentials(null);
        setCopied(null);
    }

    function close() {
        if (isPending) return;
        setOpen(false);
        reset();
    }

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const form = new FormData();
        form.set("fullName", fullName);
        form.set("phone", phone);
        form.set("currentRank", currentRank);
        form.set("dateOfBirth", dateOfBirth);
        form.set("expiryDate", expiryDate);

        startTransition(async () => {
            const result = await createExistingStudentAction(form);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setCredentials({
                memberNumber: result.memberNumber,
                temporaryPassword: result.temporaryPassword,
            });
        });
    }

    async function copyValue(kind: "id" | "password", value: string) {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(kind);
            setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
        } catch {
            setCopied(null);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => !disabled && setOpen(true)}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                className="inline-flex items-center gap-2 bg-white border border-zinc-300 text-zinc-800 px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
                <UserPlus size={14} />
                Add existing student
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-existing-student-title"
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
                                    id="add-existing-student-title"
                                    className="font-serif text-lg font-bold text-zinc-900"
                                >
                                    Add existing student
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

                        {credentials ? (
                            <div className="px-6 py-5 space-y-4">
                                <div
                                    role="status"
                                    className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-sm p-3"
                                >
                                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        Account created. Share the Member ID and
                                        temporary password with the student —
                                        they&apos;ll be asked to set a new
                                        password on their first login.
                                    </span>
                                </div>

                                <CredentialRow
                                    label="Member ID"
                                    value={credentials.memberNumber}
                                    copied={copied === "id"}
                                    onCopy={() =>
                                        copyValue("id", credentials.memberNumber)
                                    }
                                />
                                <CredentialRow
                                    label="Temporary password"
                                    value={credentials.temporaryPassword}
                                    copied={copied === "password"}
                                    onCopy={() =>
                                        copyValue(
                                            "password",
                                            credentials.temporaryPassword
                                        )
                                    }
                                    mono
                                />

                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Copy these now — the temporary password is
                                    shown only once. If the student loses it,
                                    remove them from the roster and re-create
                                    the account.
                                </p>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            reset();
                                        }}
                                        className="text-xs font-bold tracking-widest uppercase text-zinc-600 hover:text-zinc-900 px-3 py-2.5"
                                    >
                                        Add another
                                    </button>
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                                <Field label="Full name" htmlFor="add-existing-name">
                                    <input
                                        id="add-existing-name"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        disabled={isPending}
                                        placeholder="e.g. Rahim Uddin"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Phone number" htmlFor="add-existing-phone">
                                    <input
                                        id="add-existing-phone"
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={isPending}
                                        placeholder="e.g. 01711 000000"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Belt rank" htmlFor="add-existing-rank">
                                    <select
                                        id="add-existing-rank"
                                        required
                                        value={currentRank}
                                        onChange={(e) => setCurrentRank(e.target.value)}
                                        disabled={isPending}
                                        className={inputClass}
                                    >
                                        {BELT_RANKS_ORDERED.map((r) => (
                                            <option key={r} value={r}>
                                                {formatBeltRank(r)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field
                                        label="Date of birth"
                                        htmlFor="add-existing-dob"
                                        hint="Optional"
                                    >
                                        <input
                                            id="add-existing-dob"
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(e) =>
                                                setDateOfBirth(e.target.value)
                                            }
                                            disabled={isPending}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field
                                        label="Membership expiry"
                                        htmlFor="add-existing-expiry"
                                    >
                                        <input
                                            id="add-existing-expiry"
                                            type="date"
                                            required
                                            value={expiryDate}
                                            onChange={(e) =>
                                                setExpiryDate(e.target.value)
                                            }
                                            disabled={isPending}
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {error && (
                                    <div
                                        role="alert"
                                        className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-sm p-3"
                                    >
                                        {error}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={close}
                                        disabled={isPending}
                                        className="text-xs font-bold tracking-widest uppercase text-zinc-600 hover:text-zinc-900 disabled:opacity-60 px-3 py-2.5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors rounded-sm"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                                Creating
                                            </>
                                        ) : (
                                            "Create account"
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

const inputClass =
    "w-full bg-white border border-zinc-300 rounded-sm px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red disabled:opacity-60";

function Field({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5"
            >
                {label}
                {hint && (
                    <span className="text-zinc-400 font-normal normal-case tracking-normal ml-1">
                        ({hint})
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

function CredentialRow({
    label,
    value,
    copied,
    onCopy,
    mono = false,
}: {
    label: string;
    value: string;
    copied: boolean;
    onCopy: () => void;
    mono?: boolean;
}) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5">
                {label}
            </p>
            <div className="flex items-center gap-2">
                <code
                    className={`flex-1 bg-zinc-100 border border-zinc-200 rounded-sm px-3 py-2.5 text-sm text-zinc-900 select-all ${
                        mono ? "font-mono" : "font-mono"
                    }`}
                >
                    {value}
                </code>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-3 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
                >
                    {copied ? (
                        <>
                            <CheckCircle2 size={14} />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy size={14} />
                            Copy
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
