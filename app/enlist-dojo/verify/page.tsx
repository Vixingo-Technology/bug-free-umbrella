"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { resendDojoOtp, verifyDojoOtp } from "@/app/actions/enlist-dojo";

const OTP_LENGTH = 6;

export default function EnlistDojoVerifyPage() {
    const router = useRouter();
    const params = useSearchParams();
    const email = params.get("email") ?? "";

    const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isResending, startResend] = useTransition();

    function handleChange(i: number, value: string) {
        const v = value.replace(/\D/g, "").slice(-1);
        const next = [...code];
        next[i] = v;
        setCode(next);
        if (v && i < OTP_LENGTH - 1) {
            inputsRef.current[i + 1]?.focus();
        }
    }

    function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Backspace" && !code[i] && i > 0) {
            inputsRef.current[i - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        e.preventDefault();
        const txt = e.clipboardData.getData("text").replace(/\D/g, "");
        if (!txt) return;
        const next = Array(OTP_LENGTH).fill("");
        for (let i = 0; i < Math.min(OTP_LENGTH, txt.length); i++) {
            next[i] = txt[i];
        }
        setCode(next);
        const last = Math.min(txt.length, OTP_LENGTH) - 1;
        inputsRef.current[last]?.focus();
    }

    function handleSubmit() {
        const joined = code.join("");
        if (joined.length < OTP_LENGTH) {
            setError("Please enter all 6 digits.");
            return;
        }
        setError(null);
        setNotice(null);
        startTransition(async () => {
            const result = await verifyDojoOtp(email, joined);
            if (result?.error) {
                setError(result.error);
                return;
            }
            router.push(
                `/enlist-dojo/set-password?email=${encodeURIComponent(email)}`
            );
        });
    }

    function handleResend() {
        if (!email) return;
        setError(null);
        setNotice(null);
        startResend(async () => {
            const result = await resendDojoOtp(email);
            if (result?.error) {
                setError(result.error);
                return;
            }
            setNotice("A new code has been sent to your email.");
        });
    }

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md mx-auto px-6 relative z-10">
                <Link
                    href="/enlist-dojo/signup"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back to signup
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass p-10 rounded-2xl shadow-xl text-center"
                >
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <Image
                            src={Logo}
                            alt="JKA Bangladesh logo"
                            width={56}
                            height={56}
                        />
                        <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center">
                            <Mail size={28} className="text-accent-red" />
                        </div>
                    </div>

                    <h1 className="font-serif text-2xl font-bold text-zinc-900 mb-3">
                        Verify your email
                    </h1>
                    <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                        We sent a 6-digit verification code to
                        <br />
                        <span className="text-zinc-900 font-semibold">
                            {email || "your email"}
                        </span>
                        . Enter it below to continue.
                    </p>

                    <div className="flex justify-center gap-2 mb-6">
                        {code.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => {
                                    inputsRef.current[i] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                onChange={(e) =>
                                    handleChange(i, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                onPaste={handlePaste}
                                className="w-12 h-14 md:w-14 md:h-16 text-center font-karate text-2xl font-bold text-zinc-900 bg-white border border-zinc-300 focus:outline-none focus:border-accent-red rounded-sm transition-colors"
                            />
                        ))}
                    </div>

                    {notice && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md p-3 mb-4">
                            {notice}
                        </div>
                    )}
                    {error && (
                        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-md p-3 mb-6">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors group rounded-sm"
                    >
                        {isPending ? (
                            <>
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                                Verifying
                            </>
                        ) : (
                            <>
                                Verify & Continue
                                <ArrowRight
                                    size={14}
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </>
                        )}
                    </button>

                    <p className="text-xs text-zinc-500 mt-6">
                        Didn&apos;t get the code?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-accent-red font-semibold hover:underline disabled:opacity-50"
                        >
                            {isResending ? "Sending…" : "Resend"}
                        </button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
