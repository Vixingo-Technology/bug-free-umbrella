"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, Loader2 } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { loginAction } from "@/app/actions/auth";
import { useState, useTransition } from "react";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await loginAction(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-charcoal relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full bg-accent-red/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent-gold/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md p-6 relative z-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="glass p-10 rounded-2xl shadow-xl w-full"
                >
                    <div className="flex flex-col items-center mb-8">
                        <Image src={Logo} alt="JKA Logo" width={60} height={60} className="mb-4" />
                        <h1 className="font-serif text-3xl font-bold text-zinc-900 mb-2">Member Login</h1>
                        <p className="text-zinc-500 text-sm text-center">
                            Welcome back to JKA Bangladesh. Enter your credentials to access your account.
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block pl-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="sensei@jka.com"
                                    className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                    required
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center pl-1">
                                <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block">
                                    Password
                                </label>
                                <a href="#" className="text-xs font-semibold text-accent-red hover:text-accent-gold transition-colors">
                                    Forgot?
                                </a>
                            </div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                    required
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-zinc-900 hover:bg-accent-red text-white font-bold tracking-widest uppercase text-sm py-4 rounded-xl transition-colors mt-4 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-zinc-600">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-accent-red font-semibold hover:text-accent-gold transition-colors">
                            Apply for Membership
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
