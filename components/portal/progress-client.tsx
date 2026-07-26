"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import {
    Award,
    CheckCircle2,
    Clock,
    ChevronRight,
    Lock,
    Sparkles,
    Trophy,
    Target,
    Zap,
    Calendar,
} from "lucide-react";
import TiltCard from "./tilt-card";

interface Props {
    member: any;
    allBeltRanks: any[];
    gradings: any[];
}

const beltBg: Record<string, string> = {
    "White Belt":          "bg-white border-2 border-zinc-300",
    "Stripe Yellow Belt":  "bg-gradient-to-r from-white via-yellow-300 to-white border-2 border-yellow-400",
    "Yellow Belt":         "bg-yellow-400",
    "Orange Belt":         "bg-orange-500",
    "Green Belt":          "bg-green-600",
    "Blue Belt":           "bg-blue-600",
    "Purple Belt":         "bg-purple-600",
    "Brown Belt 3rd Kyu":  "bg-amber-800",
    "Brown Belt 2nd Kyu":  "bg-amber-800",
    "Brown Belt 1st Kyu":  "bg-amber-800",
    "Black Belt 1st Dan":  "bg-zinc-950",
};

/** Render-time helper so we tolerate either `name` (current schema) or `nameEn` (older queries). */
const beltName = (b: any): string => b?.name ?? b?.nameEn ?? "";

export default function ProgressClient({ member, allBeltRanks, gradings }: Props) {
    const currentRank = member?.currentRank ?? "White Belt";
    const currentIdx = allBeltRanks.findIndex((b) => beltName(b) === currentRank);
    const safeCurrentIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextRank = safeCurrentIdx >= 0 && safeCurrentIdx < allBeltRanks.length - 1
        ? allBeltRanks[safeCurrentIdx + 1]
        : null;

    const passedGradings = gradings.filter((g: any) => g.result === "PASSED").length;
    const totalGradings = gradings.length;

    // ── Quest XP — synthetic until we have attendance / kata-check data ──
    const pendingForNext = gradings.find(
        (g: any) => g.toRank?.id === nextRank?.id && g.result === "PENDING"
    );
    const appliedForNext = !!pendingForNext;

    // Checklist items — order matters; each unlocks the next.
    const checklist: { label: string; done: boolean; weight: number; icon: typeof Award }[] = [
        { label: `Earn ${currentRank}`,                      done: true,                             weight: 25, icon: Award },
        { label: "Complete required training hours",         done: passedGradings >= 1,              weight: 25, icon: Calendar },
        { label: `Master kata: ${nextRank?.requiredKata ?? "—"}`, done: false,                       weight: 20, icon: Target },
        { label: "Apply for the grading exam",               done: appliedForNext,                   weight: 15, icon: Zap },
        { label: "Pass grading & receive certificate",       done: false,                            weight: 15, icon: Trophy },
    ];
    const xpEarned = checklist.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
    const xpPct = Math.max(2, Math.min(100, xpEarned)); // floor at 2 so the bar is visible

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">My Progress</h1>
                <p className="text-zinc-500 mt-1 text-sm">Train. Apply. Unlock the next rank.</p>
            </div>

            {/* ──────────────── HERO QUEST ──────────────── */}
            <ProgressQuest
                currentRank={currentRank}
                nextRank={nextRank}
                xpPct={xpPct}
                xpEarned={xpEarned}
            />

            {/* ──────────────── UNLOCK CHECKLIST ──────────────── */}
            <TiltCard delay={0.15} className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-500" />
                        Unlock {nextRank ? beltName(nextRank) : "Next Rank"}
                    </h2>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                        {checklist.filter(c => c.done).length} / {checklist.length} done
                    </span>
                </div>

                <div className="space-y-2">
                    {checklist.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.04 }}
                                className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                    item.done
                                        ? "bg-emerald-50/70 border-emerald-100"
                                        : "bg-zinc-50/70 border-zinc-100 hover:border-accent-red/30 hover:bg-white"
                                }`}
                            >
                                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                                    item.done ? "bg-emerald-500 text-white" : "bg-white border border-zinc-200 text-zinc-400"
                                }`}>
                                    {item.done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${item.done ? "text-emerald-900 line-through decoration-emerald-400/60 decoration-1" : "text-zinc-800"}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">+{item.weight} XP</p>
                                </div>
                                {item.done ? (
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex-shrink-0">
                                        Cleared
                                    </span>
                                ) : (
                                    <Lock size={14} className="text-zinc-400 flex-shrink-0" />
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {nextRank && (
                    <Link
                        href="/portal/grading"
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-accent-red to-accent-gold text-white font-bold rounded-xl px-5 py-3 text-sm transition-all hover:shadow-[0_10px_30px_-10px_rgba(196,30,58,0.6)] hover:-translate-y-0.5"
                    >
                        <Zap size={15} />
                        {appliedForNext ? "View grading application" : `Apply for ${beltName(nextRank)} exam`}
                        <ChevronRight size={14} />
                    </Link>
                )}
            </TiltCard>

            {/* ──────────────── BELT PROGRESSION PATH ──────────────── */}
            <TiltCard delay={0.2} className="p-6" glow={false}>
                <h2 className="text-sm font-bold text-zinc-900 mb-5 flex items-center gap-2">
                    <Trophy size={16} className="text-emerald-500" />
                    Belt Progression Path
                </h2>

                <div className="space-y-2">
                    {allBeltRanks.map((belt: any, i: number) => {
                        const name = beltName(belt);
                        const isCurrent = name === currentRank;
                        const isAchieved = i < safeCurrentIdx;
                        const isNext = i === safeCurrentIdx + 1;

                        return (
                            <motion.div
                                key={belt.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + i * 0.03 }}
                                className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                                    isCurrent
                                        ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20"
                                        : isAchieved
                                        ? "bg-emerald-50/70 border-emerald-100"
                                        : isNext
                                        ? "bg-amber-50/60 border-amber-200 border-dashed"
                                        : "bg-zinc-50/40 border-zinc-100 opacity-60"
                                }`}
                            >
                                <div
                                    className={`w-7 h-7 rounded-lg flex-shrink-0 border ${
                                        name === "White Belt" ? "border-zinc-300" : "border-transparent"
                                    }`}
                                    style={{ backgroundColor: belt.colorHex ?? "#888" }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${isCurrent ? "text-white" : isAchieved ? "text-emerald-800" : "text-zinc-700"}`}>
                                        {name}
                                    </p>
                                    <p className={`text-xs ${isCurrent ? "text-zinc-400" : "text-zinc-500"}`}>
                                        {belt.kyuDan ?? ""}{belt.requiredKata ? ` · ${belt.requiredKata}` : ""}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {isCurrent && (
                                        <span className="text-[10px] font-bold tracking-widest uppercase bg-accent-red px-2.5 py-1 rounded-full">Current</span>
                                    )}
                                    {isAchieved && <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {isNext && (
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <Lock size={10} /> Next
                                        </span>
                                    )}
                                    {!isCurrent && !isAchieved && !isNext && (
                                        <Lock size={14} className="text-zinc-300" />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </TiltCard>

            {/* ──────────────── GRADING HISTORY ──────────────── */}
            <TiltCard delay={0.25} className="p-6" glow={false}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Award size={16} className="text-amber-500" />
                        Full Grading History
                    </h2>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                        {passedGradings} passed · {totalGradings} total
                    </span>
                </div>

                {gradings.length > 0 ? (
                    <div className="space-y-2">
                        {gradings.map((g: any, i: number) => (
                            <div key={g.id ?? i} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/70 hover:bg-zinc-100/80 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    {g.result === "PASSED" ? (
                                        <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
                                    ) : g.result === "FAILED" ? (
                                        <Award size={17} className="text-red-400 flex-shrink-0" />
                                    ) : (
                                        <Clock size={17} className="text-amber-500 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 truncate">
                                            {beltName(g.fromRank) || "—"} → {beltName(g.toRank) || "—"}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {g.gradingEvent?.title && (
                                                <p className="text-xs text-zinc-500 truncate">{g.gradingEvent.title}</p>
                                            )}
                                            {g.gradedAt && (
                                                <p className="text-xs text-zinc-400">
                                                    {new Date(g.gradedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full ${
                                        g.result === "PASSED" ? "bg-emerald-50 text-emerald-600" :
                                        g.result === "FAILED" ? "bg-red-50 text-red-600" :
                                        "bg-amber-50 text-amber-600"
                                    }`}>
                                        {g.result ?? "PENDING"}
                                    </span>
                                    {g.certificateUrl && (
                                        <a href={g.certificateUrl} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] text-accent-red hover:text-accent-gold font-bold transition-colors">
                                            PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Award size={32} className="text-zinc-200 mb-3" />
                        <p className="text-zinc-500 text-sm">No grading records yet.</p>
                        <p className="text-zinc-400 text-xs mt-1">Your grading results will appear here after your first exam.</p>
                    </div>
                )}
            </TiltCard>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressQuest — the gamified hero. Two belt orbs with an animated XP track
// between them, the whole thing tilts under the mouse like a trophy plaque.
// ─────────────────────────────────────────────────────────────────────────────

function ProgressQuest({
    currentRank,
    nextRank,
    xpPct,
    xpEarned,
}: {
    currentRank: string;
    nextRank: any;
    xpPct: number;
    xpEarned: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 22 });
    const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 22 });
    const glowX = useTransform(mx, [-0.5, 0.5], ["20%", "80%"]);

    function onMove(e: React.MouseEvent) {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    }
    function onLeave() { mx.set(0); my.set(0); }

    const nextName = nextRank ? (nextRank.name ?? nextRank.nameEn ?? "Master Rank") : "Master Rank";
    const currentColor = beltBg[currentRank] ?? "bg-zinc-700";
    const nextColor = nextRank?.colorHex ?? "#facc15";

    return (
        <div style={{ perspective: 1400 }} className="group">
            <motion.div
                ref={ref}
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white shadow-2xl border border-white/5"
            >
                {/* Cursor-tracking glow */}
                <motion.div
                    aria-hidden
                    style={{
                        background: `radial-gradient(420px circle at ${glowX} 30%, rgba(196,30,58,0.35), transparent 60%)`,
                    }}
                    className="absolute inset-0 opacity-70 transition-opacity duration-300"
                />

                {/* Decorative orbs */}
                <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px] opacity-30" style={{ backgroundColor: nextColor }} />
                <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-accent-gold/30 rounded-full blur-[80px]" />

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }} />

                <div style={{ transform: "translateZ(30px)" }} className="relative z-10 p-6 sm:p-8">
                    {/* Top label */}
                    <div className="flex items-center justify-between mb-7">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-amber-400" />
                            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400">Rank Quest</p>
                        </div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                            Level {xpEarned} XP
                        </p>
                    </div>

                    {/* Belt orbs + progress track */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Current */}
                        <div className="flex flex-col items-center text-center flex-shrink-0">
                            <motion.div
                                animate={{ scale: [1, 1.04, 1] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${currentColor} shadow-2xl flex items-center justify-center relative`}
                                style={{ boxShadow: `0 0 40px -5px ${currentRank === "White Belt" ? "rgba(255,255,255,0.4)" : "rgba(196,30,58,0.5)"}` }}
                            >
                                <Award size={26} className={currentRank === "White Belt" ? "text-zinc-400" : "text-white"} />
                            </motion.div>
                            <p className="text-[9px] tracking-[0.25em] uppercase text-zinc-400 mt-2.5 font-bold">You</p>
                            <p className="text-xs font-semibold text-white mt-0.5 leading-tight max-w-[5rem]">{currentRank}</p>
                        </div>

                        {/* Track */}
                        <div className="flex-1 relative pt-1">
                            <div className="relative h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpPct}%` }}
                                    transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-red via-orange-500 to-amber-400 shadow-[0_0_20px_rgba(196,30,58,0.6)]"
                                />
                                {/* Shimmer */}
                                <motion.div
                                    animate={{ x: ["-30%", "130%"] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                    style={{ left: 0 }}
                                />
                                {/* Milestone notches */}
                                {[25, 50, 75].map((m) => (
                                    <div
                                        key={m}
                                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/20"
                                        style={{ left: `${m}%` }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <p className="text-[11px] text-zinc-400">
                                    <span className="font-bold text-white">{xpPct}%</span> to unlock
                                </p>
                                <p className="text-[10px] tracking-widest uppercase text-zinc-500">{100 - xpPct} XP remaining</p>
                            </div>
                        </div>

                        {/* Next */}
                        <div className="flex flex-col items-center text-center flex-shrink-0">
                            <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-2xl flex items-center justify-center relative grayscale-[0.35]"
                                style={{
                                    backgroundColor: nextColor,
                                    boxShadow: `0 0 50px -5px ${nextColor}`,
                                }}
                            >
                                <Lock size={22} className="text-white drop-shadow-lg" />
                                {/* Pulsing ring */}
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-2xl border-2"
                                    style={{ borderColor: nextColor }}
                                />
                            </motion.div>
                            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-400 mt-2.5 font-bold">Locked</p>
                            <p className="text-xs font-semibold text-white mt-0.5 leading-tight max-w-[5rem]">{nextName}</p>
                        </div>
                    </div>

                    {/* Footer hint */}
                    <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
                        <p className="text-xs text-zinc-400">
                            Complete the checklist below to{" "}
                            <span className="text-amber-400 font-semibold">unlock {nextName}</span>.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-zinc-500">
                            <Sparkles size={12} className="text-amber-400" />
                            Tilt me — hover over the card
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
