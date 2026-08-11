"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Share2, QrCode, Package, ArrowRight, Home } from "lucide-react";
import { BELT_COLORS } from "@/lib/constants";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

interface Props {
    member: any;
    order: any;
    hasProducts: boolean;
}

export default function PaymentSuccessClient({ member, order, hasProducts }: Props) {
    const [showCard, setShowCard] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setShowCard(true), 500);
        return () => clearTimeout(t);
    }, []);

    const memberName = member?.fullName ?? "Member";
    const beltColor = BELT_COLORS[member?.currentRank ?? "White Belt"] ?? "#FFFFFF";
    const rank = member?.currentRank ?? "White Belt";
    const memberNumber = member?.memberNumber ?? "JKA-BD";
    const dojo = member?.dojo?.name ?? "JKA Bangladesh";
    const expiryStr = member?.expiryDate
        ? new Date(member.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" ,
 timeZone: DEFAULT_TIME_ZONE,
})
        : "—";
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${memberNumber}`;

    function handleCopy() {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">

                {/* Success tick */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18 }}
                    className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 size={40} className="text-emerald-400" />
                </motion.div>

                {/* Main message */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <p className="text-xs font-black tracking-[0.35em] uppercase text-emerald-500 mb-2">Payment Successful</p>
                    <h1 className="text-3xl font-bold text-white leading-tight">
                        You are now a proud<br />member of JKA Bangladesh.
                    </h1>
                    <p className="text-white/40 text-sm mt-3 leading-relaxed">
                        Welcome, {memberName.split(" ")[0]}. Your journey in the martial arts begins here.
                        Your membership is active until <span className="text-white/60 font-medium">{expiryStr}</span>.
                    </p>
                </motion.div>

                {/* Products delivery note */}
                <AnimatePresence>
                    {hasProducts && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3.5 mt-6 text-blue-400 text-sm text-left"
                        >
                            <Package size={18} className="flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Your gear is on its way!</p>
                                <p className="text-xs text-blue-400/70 mt-0.5">
                                    Your selected products will arrive at your dojo in 1–2 business days.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Digital membership card */}
                <AnimatePresence>
                    {showCard && (
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 100, damping: 16, delay: 0.1 }}
                            className="mt-8 mb-6"
                        >
                            {/* Mini membership card */}
                            <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                                <div
                                    className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-25"
                                    style={{ backgroundColor: beltColor }}
                                />
                                <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-0.5">JKA Bangladesh</p>
                                        <p className="text-white font-bold text-lg">{memberName.toUpperCase()}</p>
                                        <p className="text-white/50 text-xs mt-0.5">{rank} · {dojo}</p>
                                        <p className="text-white/30 text-[10px] font-mono mt-2">{memberNumber}</p>
                                    </div>
                                    <div
                                        className="w-12 h-12 rounded-xl border border-white/20 shadow-lg flex-shrink-0"
                                        style={{
                                            backgroundColor: beltColor,
                                            boxShadow: `0 0 16px ${beltColor}50`,
                                        }}
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Share actions */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex gap-3 mb-6"
                >
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm font-medium rounded-xl px-4 py-3 transition-all"
                    >
                        <Share2 size={15} />
                        {copied ? "Copied!" : "Share Card Link"}
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm font-medium rounded-xl px-4 py-3 transition-all"
                        title="QR code coming soon"
                    >
                        <QrCode size={15} />
                        Share via QR
                    </button>
                </motion.div>

                {/* Go to dashboard — full-page navigation so the portal layout
                    re-runs with the fresh pathname and the sidebar shell renders
                    (a client-side <Link> can keep the fullscreen layout cached). */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                >
                    <a
                        href="/portal"
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl px-8 py-3.5 text-sm transition-all shadow-[0_8px_24px_rgba(220,38,38,0.35)] hover:-translate-y-0.5"
                    >
                        <Home size={16} />
                        Go to My Dashboard
                        <ArrowRight size={16} />
                    </a>
                </motion.div>
            </div>
        </div>
    );
}
