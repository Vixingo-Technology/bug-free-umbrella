"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordClient() {
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("email", email);
        startTransition(async () => {
            const res = await forgotPasswordAction(fd);
            if ("error" in res && res.error) setError(res.error);
            else setSent(true);
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-6 group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                <div className="flex items-center justify-center gap-3 mb-8">
                    <Image src={Logo} alt="JKA" width={44} height={44} />
                    <div>
                        <p className="font-karate text-sm tracking-[0.3em] text-zinc-900 leading-tight">
                            JKA <span className="text-accent-red">BANGLADESH</span>
                        </p>
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 leading-tight">
                            Account Recovery
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 size={24} className="text-emerald-600" />
                            </div>
                            <h1 className="text-xl font-bold text-zinc-900">Check your inbox</h1>
                            <p className="text-sm text-zinc-500 mt-2">
                                If an account exists for{" "}
                                <span className="font-semibold text-zinc-700">{email}</span>, we&rsquo;ve sent
                                a link to reset your password. The link expires in 1 hour.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block mt-6 text-sm font-semibold text-accent-red hover:text-accent-gold transition-colors"
                            >
                                Return to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start gap-3 mb-6">
                                <div className="p-2.5 bg-accent-red/10 rounded-xl">
                                    <Mail size={20} className="text-accent-red" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-zinc-900">Admin password reset</h1>
                                    <p className="text-sm text-zinc-500 mt-1">
                                        Only JKA admin accounts can reset their password by email. Students, instructors, and dojo owners should contact their Dojo Head or a JKA admin for a password reset.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@example.com"
                                        className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white transition-colors"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPending || !email}
                                    className="w-full py-3 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                                >
                                    {isPending ? "Sending…" : "Send Reset Link"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-zinc-400 mt-6">
                    Need help? Contact your dojo administrator.
                </p>
            </motion.div>
        </div>
    );
}
