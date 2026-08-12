"use client";

import { useState, useTransition } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    X,
} from "lucide-react";

type ResetResult =
    | { ok: true; temporaryPassword: string }
    | { ok: false; error: string };

type Props = {
    /** Human name of the account being reset. */
    targetName: string;
    /** Extra context line (e.g. "STUDENT · Cheltenham Dojo"). */
    targetSubtitle?: string;
    /**
     * Called when the user confirms. Receives the manually-entered password
     * when the user chose "Set manually"; `undefined` means auto-generate.
     */
    onConfirm: (manualPassword?: string) => Promise<ResetResult>;
    /** Button label. Defaults to "Reset password". */
    label?: string;
    /** Visual variant of the trigger button. */
    variant?: "primary" | "outline" | "ghost";
    /** Extra classes appended to the trigger button. */
    className?: string;
    disabled?: boolean;
    disabledReason?: string;
};

/**
 * Trigger + confirmation modal for resetting another user's password.
 * On success, shows the one-shot temporary password with copy buttons.
 */
export default function ResetPasswordButton({
    targetName,
    targetSubtitle,
    onConfirm,
    label = "Reset password",
    variant = "outline",
    className = "",
    disabled = false,
    disabledReason,
}: Props) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<"auto" | "manual">("auto");
    const [manualPassword, setManualPassword] = useState("");
    const [manualConfirm, setManualConfirm] = useState("");
    const [showManual, setShowManual] = useState(false);

    function close() {
        if (isPending) return;
        setOpen(false);
        setError(null);
        setPassword(null);
        setCopied(false);
        setMode("auto");
        setManualPassword("");
        setManualConfirm("");
        setShowManual(false);
    }

    function submit() {
        setError(null);
        if (mode === "manual") {
            if (manualPassword.length < 8) {
                setError("Password must be at least 8 characters.");
                return;
            }
            if (manualPassword !== manualConfirm) {
                setError("Passwords do not match.");
                return;
            }
        }
        startTransition(async () => {
            const result = await onConfirm(mode === "manual" ? manualPassword : undefined);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setPassword(result.temporaryPassword);
        });
    }

    async function copy() {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    }

    const triggerCls =
        variant === "primary"
            ? "inline-flex items-center gap-2 bg-accent-red text-white hover:bg-accent-red/90 px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            : variant === "ghost"
              ? "inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-accent-red hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-zinc-200 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              : "inline-flex items-center gap-2 bg-white border border-zinc-300 text-zinc-800 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <>
            <button
                type="button"
                onClick={() => !disabled && setOpen(true)}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                className={`${triggerCls} ${className}`.trim()}
            >
                <KeyRound size={14} />
                {label}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reset-password-title"
                    onClick={close}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-zinc-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-200">
                            <div>
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                    Password reset
                                </p>
                                <h2
                                    id="reset-password-title"
                                    className="font-serif text-lg font-bold text-zinc-900"
                                >
                                    {targetName}
                                </h2>
                                {targetSubtitle && (
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {targetSubtitle}
                                    </p>
                                )}
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

                        {password ? (
                            <div className="px-6 py-5 space-y-4">
                                <div
                                    role="status"
                                    className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-sm p-3"
                                >
                                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        Password reset. Share the temporary
                                        password below — the user will be asked
                                        to set a new one on their next login.
                                    </span>
                                </div>

                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5">
                                        Temporary password
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-zinc-100 border border-zinc-200 rounded-sm px-3 py-2.5 text-sm text-zinc-900 select-all font-mono">
                                            {password}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={copy}
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

                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Copy this now — the temporary password is
                                    shown only once. If the user loses it, run
                                    another reset.
                                </p>

                                <div className="flex items-center justify-end pt-2">
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
                            <div className="px-6 py-5 space-y-4">
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-sm p-3">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        The current password will stop working
                                        immediately. Choose auto-generate for a
                                        secure random password, or set one
                                        manually.
                                    </span>
                                </div>

                                <div className="flex gap-2 p-1 bg-zinc-100 rounded-sm">
                                    <button
                                        type="button"
                                        onClick={() => { setMode("auto"); setError(null); }}
                                        disabled={isPending}
                                        className={`flex-1 text-xs font-bold tracking-widest uppercase py-2 rounded-sm transition-colors ${
                                            mode === "auto"
                                                ? "bg-white text-zinc-900 shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-800"
                                        }`}
                                    >
                                        Auto-generate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMode("manual"); setError(null); }}
                                        disabled={isPending}
                                        className={`flex-1 text-xs font-bold tracking-widest uppercase py-2 rounded-sm transition-colors ${
                                            mode === "manual"
                                                ? "bg-white text-zinc-900 shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-800"
                                        }`}
                                    >
                                        Set manually
                                    </button>
                                </div>

                                {mode === "manual" && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5">
                                                New password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showManual ? "text" : "password"}
                                                    value={manualPassword}
                                                    onChange={(e) => setManualPassword(e.target.value)}
                                                    placeholder="At least 8 characters"
                                                    autoComplete="new-password"
                                                    minLength={8}
                                                    disabled={isPending}
                                                    className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 pr-10 py-2.5 focus:outline-none focus:border-accent-red text-sm rounded-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowManual((s) => !s)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-accent-red"
                                                >
                                                    {showManual ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1.5">
                                                Confirm password
                                            </label>
                                            <input
                                                type={showManual ? "text" : "password"}
                                                value={manualConfirm}
                                                onChange={(e) => setManualConfirm(e.target.value)}
                                                placeholder="Re-enter password"
                                                autoComplete="new-password"
                                                minLength={8}
                                                disabled={isPending}
                                                className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm rounded-sm"
                                            />
                                        </div>
                                    </div>
                                )}

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
                                        type="button"
                                        onClick={submit}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors rounded-sm"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Resetting
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound size={14} />
                                                Reset password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
