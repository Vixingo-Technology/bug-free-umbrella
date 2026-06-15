"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "motion/react";
import { CreditCard, Zap, Clock, ChevronLeft, AlertCircle } from "lucide-react";
import { payNowAction, payLaterAction } from "@/app/portal/onboarding/actions";
import { MEMBERSHIP_FEE_BDT, BELT_COLORS } from "@/lib/constants";

interface Props {
    member: any;
    orderId: string | null;
    onBack: () => void;
}

export default function StepWelcome({ member, orderId, onBack }: Props) {
    const [isPending, startTransition] = useTransition();
    const [pendingAction, setPendingAction] = useState<"pay" | "later" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cardRevealed, setCardRevealed] = useState(false);

    // 3D tilt on mouse move
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 150, damping: 20 });
    const shineX = useTransform(mouseX, [-0.5, 0.5], ["-20%", "120%"]);
    const shineY = useTransform(mouseY, [-0.5, 0.5], ["-20%", "120%"]);

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    }
    function handleMouseLeave() {
        mouseX.set(0);
        mouseY.set(0);
    }

    // Sequence: fade in → card flips → settle
    useEffect(() => {
        const t = setTimeout(() => setCardRevealed(true), 600);
        return () => clearTimeout(t);
    }, []);

    const beltColor = BELT_COLORS[member?.currentRank ?? "White Belt"] ?? "#FFFFFF";
    const isWhite = beltColor === "#FFFFFF";
    const memberName = member?.fullName ?? "New Member";
    const memberNumber = member?.memberNumber ?? "JKA-PENDING";
    const dojoName = member?.dojo?.name ?? "JKA Bangladesh";
    const rank = member?.currentRank ?? "White Belt";

    // Expiry = 1 year from today
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" });

    function handlePay() {
        if (!orderId) return;
        setError(null);
        setPendingAction("pay");
        startTransition(() => payNowAction(orderId));
    }

    function handleLater() {
        if (!orderId) return;
        setError(null);
        setPendingAction("later");
        startTransition(() => payLaterAction(orderId));
    }

    return (
        <div className="text-center">
            {/* Welcome text */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-8"
            >
                <p className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-2">Welcome to the Family</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    Your membership card<br />is ready, {memberName.split(" ")[0]}.
                </h1>
                <p className="text-white/40 text-sm mt-3">
                    Complete your payment to activate your membership.
                </p>
            </motion.div>

            {/* 3D Membership Card */}
            <motion.div
                initial={{ opacity: 0, y: 40, rotateX: -30 }}
                animate={cardRevealed
                    ? { opacity: 1, y: 0, rotateX: 0 }
                    : { opacity: 0, y: 40, rotateX: -30 }
                }
                transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.1 }}
                style={{ perspective: 1000 }}
                className="flex justify-center mb-8"
            >
                <motion.div
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative cursor-pointer select-none"
                >
                    {/* Card body */}
                    <div className="relative w-80 h-48 rounded-[20px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

                        {/* Belt color accent */}
                        <div
                            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
                            style={{ backgroundColor: beltColor }}
                        />
                        <div
                            className="absolute bottom-0 left-0 w-20 h-20 rounded-full blur-2xl opacity-20"
                            style={{ backgroundColor: beltColor }}
                        />

                        {/* Holographic shine overlay */}
                        <motion.div
                            style={{
                                background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.12) 0%, transparent 65%)`,
                            }}
                            className="absolute inset-0 pointer-events-none"
                        />

                        {/* Card lines decoration */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" />

                        {/* Content */}
                        <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                            {/* Top row */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[9px] font-black tracking-[0.35em] uppercase text-white/40">JKA Bangladesh</p>
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mt-0.5">Member Card</p>
                                </div>
                                {/* Belt badge */}
                                <div
                                    className="w-8 h-8 rounded-lg border border-white/20 shadow-lg"
                                    style={{
                                        backgroundColor: beltColor,
                                        boxShadow: `0 0 12px ${beltColor}60`,
                                    }}
                                />
                            </div>

                            {/* Member info */}
                            <div>
                                <p className="text-white font-bold text-lg leading-tight tracking-wide">{memberName.toUpperCase()}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div>
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest">Rank</p>
                                        <p className="text-[11px] font-semibold text-white/70">{rank}</p>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div>
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest">Dojo</p>
                                        <p className="text-[11px] font-semibold text-white/70 truncate max-w-[130px]">{dojoName}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom row */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Member No.</p>
                                    <p className="text-xs font-mono font-bold text-white/60 mt-0.5">{memberNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Valid Until</p>
                                    <p className="text-xs font-mono font-bold text-white/60 mt-0.5">{expiryStr}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card reflection / shadow */}
                    <div
                        className="absolute inset-x-4 -bottom-4 h-8 blur-xl opacity-40 rounded-full"
                        style={{ background: `linear-gradient(to right, transparent, ${beltColor}, transparent)` }}
                    />
                </motion.div>
            </motion.div>

            {/* PENDING watermark notice */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8"
            >
                <Clock size={12} />
                Pending activation · ৳{MEMBERSHIP_FEE_BDT.toLocaleString()} / year
            </motion.div>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm text-left"
                >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="space-y-3"
            >
                <button
                    onClick={handlePay}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold rounded-2xl px-6 py-4 text-base transition-all shadow-[0_8px_30px_rgba(220,38,38,0.4)] hover:shadow-[0_8px_40px_rgba(220,38,38,0.6)] hover:-translate-y-0.5"
                >
                    <Zap size={18} className={pendingAction === "pay" && isPending ? "animate-pulse" : ""} />
                    {pendingAction === "pay" && isPending ? "Redirecting to payment…" : "Pay Now — Activate Membership"}
                </button>

                <button
                    onClick={handleLater}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 disabled:opacity-60 text-white/60 hover:text-white font-semibold rounded-2xl px-6 py-3.5 text-sm transition-all"
                >
                    <Clock size={16} className={pendingAction === "later" && isPending ? "animate-pulse" : ""} />
                    {pendingAction === "later" && isPending ? "Saving…" : "Pay Later — I'll activate later"}
                </button>

                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-1.5 text-white/25 hover:text-white/50 text-xs py-2 transition-colors"
                >
                    <ChevronLeft size={13} /> Back to products
                </button>
            </motion.div>
        </div>
    );
}
