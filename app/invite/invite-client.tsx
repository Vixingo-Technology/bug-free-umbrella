"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Sparkles,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { completeInviteSignupAction } from "./actions";

type InvitableRole = "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER";

const ROLE_COPY: Record<
    InvitableRole,
    { label: string; blurb: string }
> = {
    STUDENT: {
        label: "Student",
        blurb: "start training under an official JKA-recognised dojo.",
    },
    INSTRUCTOR: {
        label: "Instructor",
        blurb: "help lead classes and mentor students at the dojo.",
    },
    DOJO_MANAGER: {
        label: "Dojo Manager",
        blurb: "run the day-to-day operations of the dojo.",
    },
};

type Props = {
    email: string;
    fullName: string;
    rank: string;
    role: InvitableRole;
    dojoName: string;
};

export default function InviteClient({
    email,
    fullName: initialFullName,
    rank: initialRank,
    role,
    dojoName,
}: Props) {
    const router = useRouter();
    const [fullName, setFullName] = useState(initialFullName);
    const [rank, setRank] = useState(initialRank);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const showRank = role === "INSTRUCTOR" || role === "STUDENT";
    const rules = [
        { label: "At least 8 characters", ok: password.length >= 8 },
        { label: "Contains a number", ok: /\d/.test(password) },
        {
            label: "Passwords match",
            ok: password.length > 0 && password === confirm,
        },
    ];

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const fd = new FormData();
            fd.set("fullName", fullName);
            fd.set("rank", rank);
            fd.set("password", password);
            fd.set("confirm", confirm);
            const result = await completeInviteSignupAction(fd);
            if (result?.error) {
                setError(result.error);
                return;
            }
            router.push("/portal");
            router.refresh();
        });
    }

    const copy = ROLE_COPY[role];

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-lg mx-auto px-6 relative z-10">
                <motion.div
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
                            <Sparkles size={14} />
                            You&apos;re invited
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-zinc-900 mb-2">
                            Welcome to {dojoName}
                        </h1>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            <span className="font-semibold text-zinc-700">
                                {dojoName}
                            </span>{" "}
                            has invited you to join as a{" "}
                            <span className="font-semibold text-zinc-700">
                                {copy.label}
                            </span>{" "}
                            — {copy.blurb} Confirm your details and set a
                            password to enter your dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Email</Label>
                            <input
                                type="email"
                                value={email}
                                readOnly
                                disabled
                                className="w-full bg-zinc-100 border border-zinc-200 text-zinc-600 px-4 py-3 text-sm rounded-sm cursor-not-allowed"
                            />
                        </div>

                        <div
                            className={
                                showRank
                                    ? "grid md:grid-cols-2 gap-4"
                                    : ""
                            }
                        >
                            <div>
                                <Label>Full name</Label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    placeholder="e.g. Sensei Rahim"
                                    required
                                    className={inputClass}
                                />
                            </div>
                            {showRank && (
                                <div>
                                    <Label>Belt rank</Label>
                                    <input
                                        type="text"
                                        value={rank}
                                        onChange={(e) =>
                                            setRank(e.target.value)
                                        }
                                        placeholder="e.g. 3rd Dan"
                                        className={inputClass}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <Label>Password</Label>
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
                                    required
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
                            <Label>Confirm password</Label>
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
                                    required
                                    className="w-full bg-white border border-zinc-200 text-zinc-900 pl-9 pr-3 py-3 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                />
                            </div>
                        </div>

                        <ul className="space-y-1.5">
                            {rules.map((r) => (
                                <li
                                    key={r.label}
                                    className={`flex items-center gap-2 text-xs ${
                                        r.ok
                                            ? "text-emerald-700"
                                            : "text-zinc-500"
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
                            <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-md p-3">
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
                                    Activating
                                </>
                            ) : (
                                <>
                                    Continue to Dashboard
                                    <ArrowRight
                                        size={14}
                                        className="group-hover:translate-x-1 transition-transform"
                                    />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

const inputClass =
    "w-full bg-white border border-zinc-200 text-zinc-900 px-4 py-3 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm placeholder:text-zinc-400";

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
            {children}
        </label>
    );
}
