"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    Lock,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { setDojoOwnerPassword } from "@/app/actions/enlist-dojo";

export default function EnlistDojoSetPasswordPage() {
    const router = useRouter();
    const params = useSearchParams();
    const email = params.get("email") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const rules = [
        { label: "At least 8 characters", ok: password.length >= 8 },
        { label: "Contains a number", ok: /\d/.test(password) },
        {
            label: "Contains an uppercase letter",
            ok: /[A-Z]/.test(password),
        },
        {
            label: "Passwords match",
            ok: password.length > 0 && password === confirm,
        },
    ];

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await setDojoOwnerPassword(password, confirm);
            if (result?.error) {
                setError(result.error);
                return;
            }
            router.push(
                `/enlist-dojo/payment?email=${encodeURIComponent(email)}`
            );
        });
    }

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md mx-auto px-6 relative z-10">
                <Link
                    href={`/enlist-dojo/verify?email=${encodeURIComponent(
                        email
                    )}`}
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back
                </Link>

                <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass p-10 rounded-2xl shadow-xl"
                >
                    <div className="flex flex-col items-center text-center mb-8">
                        <Image
                            src={Logo}
                            alt="JKA Bangladesh logo"
                            width={56}
                            height={56}
                        />
                        <div className="flex items-center gap-2 text-accent-red text-xs font-bold tracking-widest uppercase mt-6 mb-3">
                            <CheckCircle2 size={14} />
                            Email verified
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-zinc-900 mb-2">
                            Set your password
                        </h1>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Choose a password to access your Dojo Dashboard at
                            any time. Email:{" "}
                            <span className="text-zinc-900 font-semibold">
                                {email || "—"}
                            </span>
                        </p>
                    </div>

                    <div className="space-y-4 mb-4">
                        <div>
                            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                                />
                                <input
                                    type={show ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    className="w-full bg-white border border-zinc-200 text-zinc-900 pl-9 pr-10 py-3 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-accent-red transition-colors"
                                >
                                    {show ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                                Confirm password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                                />
                                <input
                                    type={show ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) =>
                                        setConfirm(e.target.value)
                                    }
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    className="w-full bg-white border border-zinc-200 text-zinc-900 pl-9 pr-3 py-3 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <ul className="space-y-1.5 mb-6">
                        {rules.map((r) => (
                            <li
                                key={r.label}
                                className={`flex items-center gap-2 text-xs ${
                                    r.ok ? "text-emerald-700" : "text-zinc-500"
                                }`}
                            >
                                <CheckCircle2
                                    size={14}
                                    className={
                                        r.ok
                                            ? "text-emerald-600"
                                            : "text-zinc-300"
                                    }
                                />
                                {r.label}
                            </li>
                        ))}
                    </ul>

                    {error && (
                        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-md p-3 mb-4">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors group rounded-sm"
                    >
                        {isPending ? (
                            <>
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                                Saving
                            </>
                        ) : (
                            <>
                                Save & Continue
                                <ArrowRight
                                    size={14}
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </>
                        )}
                    </button>
                </motion.form>
            </div>
        </div>
    );
}
