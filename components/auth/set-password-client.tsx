"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { setPasswordAction } from "@/app/actions/set-password";

export default function SetPasswordClient({
    email,
    mode = "invite",
}: {
    email: string;
    mode?: "invite" | "reset" | "first-login";
}) {
    const [isPending, startTransition] = useTransition();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tooShort = password.length > 0 && password.length < 8;
    const mismatch = confirm.length > 0 && confirm !== password;
    const ready = password.length >= 8 && confirm === password;

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("password", password);
        fd.set("confirm", confirm);
        startTransition(async () => {
            const res = await setPasswordAction(fd);
            if (res?.error) setError(res.error);
        });
    }

    const heading =
        mode === "reset"
            ? "Reset your password"
            : mode === "first-login"
              ? "Choose a new password"
              : "Set your password";
    const subheading =
        mode === "reset"
            ? "Choose a new password for "
            : mode === "first-login"
              ? "Replace the temporary password for "
              : "Welcome! Set a password for ";
    const cta =
        mode === "reset"
            ? "Save New Password"
            : mode === "first-login"
              ? "Save & Continue"
              : "Activate Account";

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="flex items-center justify-center gap-3 mb-8">
                    <Image src={Logo} alt="JKA" width={44} height={44} />
                    <div>
                        <p className="font-karate text-sm tracking-[0.3em] text-zinc-900 leading-tight">
                            JKA <span className="text-accent-red">BANGLADESH</span>
                        </p>
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 leading-tight">
                            Member Portal
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
                    <div className="flex items-start gap-3 mb-6">
                        <div className="p-2.5 bg-accent-red/10 rounded-xl">
                            <KeyRound size={20} className="text-accent-red" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900">{heading}</h1>
                            <p className="text-sm text-zinc-500 mt-1">
                                {subheading}
                                <span className="font-semibold text-zinc-700">{email}</span>
                                {mode === "reset"
                                    ? "."
                                    : mode === "first-login"
                                      ? " so you can access your portal."
                                      : " to finish activating your account."}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                                {mode === "first-login" ? "Member ID" : "Email"}
                            </label>
                            <input
                                type="text"
                                value={email}
                                readOnly
                                disabled
                                className="w-full px-3 py-2.5 text-sm bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">New password</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="At least 8 characters"
                                    className={`w-full pl-3 pr-10 py-2.5 text-sm bg-zinc-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                                        tooShort
                                            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                                            : "border-zinc-200 focus:ring-accent-red/30 focus:border-accent-red"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {tooShort && (
                                <p className="text-xs text-red-600 mt-1.5">Use at least 8 characters.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">Confirm password</label>
                            <input
                                type={showPwd ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                placeholder="Re-enter your password"
                                className={`w-full px-3 py-2.5 text-sm bg-zinc-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                                    mismatch
                                        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                                        : "border-zinc-200 focus:ring-accent-red/30 focus:border-accent-red"
                                }`}
                            />
                            {mismatch && (
                                <p className="text-xs text-red-600 mt-1.5">Passwords don&rsquo;t match.</p>
                            )}
                            {ready && (
                                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Looks good.
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending || !ready}
                            className="w-full py-3 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                        >
                            {isPending ? "Saving…" : cta}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-zinc-400 mt-6">
                    Need help? Contact your dojo administrator.
                </p>
            </motion.div>
        </div>
    );
}
