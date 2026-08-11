"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { signupAction } from "@/app/actions/auth";
import { useState, useTransition } from "react";

export default function SignupPage() {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await signupAction(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-charcoal relative overflow-hidden py-12">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-lg p-6 relative z-10">
                <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Pick a different role
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="glass p-10 rounded-2xl shadow-xl w-full"
                >
                    <div className="flex flex-col items-center mb-8">
                        <Image src={Logo} alt="JKA Logo" width={60} height={60} className="mb-4" />
                        <h1 className="font-serif text-3xl font-bold text-zinc-900 mb-2 text-center">Join JKA Bangladesh</h1>
                        <p className="text-zinc-500 text-sm text-center">
                            Begin your journey in the highest tradition of Shotokan Karate. Apply for membership below.
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

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block pl-1">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="John"
                                        className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                        required
                                        disabled={isPending}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block pl-1">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Doe"
                                        className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                        required
                                        disabled={isPending}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block pl-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john.doe@example.com"
                                    className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                    required
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold tracking-widest uppercase text-zinc-600 block pl-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Create a strong password"
                                    className="w-full bg-white/50 border border-zinc-200 rounded-xl py-3 pl-11 pr-12 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-all"
                                    required
                                    disabled={isPending}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    disabled={isPending}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-accent-red transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-sm py-4 rounded-xl transition-colors mt-4 shadow-lg shadow-accent-red/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Submit Application"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-zinc-600">
                        Already a member?{" "}
                        <Link href="/login" className="text-accent-red font-semibold hover:text-accent-gold transition-colors">
                            Sign In
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
