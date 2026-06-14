"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Award, CheckCircle2, Clock, ChevronRight, TrendingUp } from "lucide-react";

interface Props {
    member: any;
    allBeltRanks: any[];
    gradings: any[];
}

const beltBg: Record<string, string> = {
    "White Belt":  "bg-white border-2 border-zinc-300",
    "Yellow Belt": "bg-yellow-400",
    "Orange Belt": "bg-orange-500",
    "Green Belt":  "bg-green-600",
    "Blue Belt":   "bg-blue-600",
    "Brown Belt":  "bg-amber-800",
    "Black Belt":  "bg-zinc-950",
};

export default function ProgressClient({ member, allBeltRanks, gradings }: Props) {
    const currentRank = member?.currentRank ?? "White Belt";
    const currentIdx = allBeltRanks.findIndex((b) => b.nameEn === currentRank);
    const nextRank = currentIdx >= 0 && currentIdx < allBeltRanks.length - 1
        ? allBeltRanks[currentIdx + 1]
        : null;

    const passedGradings = gradings.filter((g: any) => g.result === "PASSED").length;
    const totalGradings = gradings.length;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">My Progress</h1>
                <p className="text-zinc-500 mt-1 text-sm">Track your rank journey through the JKA belt system.</p>
            </div>

            {/* Current rank hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 sm:p-8 text-white shadow-xl"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent-red/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-gold/10 rounded-full blur-[60px]" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex-shrink-0">
                        <div className={`w-20 h-20 rounded-2xl shadow-lg ${beltBg[currentRank] ?? "bg-zinc-700"} flex items-center justify-center`}>
                            <Award size={32} className={currentRank === "White Belt" ? "text-zinc-400" : "text-white"} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-bold">Current Rank</p>
                        <h2 className="text-2xl sm:text-3xl font-bold mt-1">{currentRank}</h2>
                        {allBeltRanks[currentIdx]?.kyuDan && (
                            <p className="text-zinc-400 text-sm mt-0.5">{allBeltRanks[currentIdx].kyuDan}</p>
                        )}
                        <div className="flex items-center gap-4 mt-4">
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Gradings Passed</p>
                                <p className="text-lg font-bold mt-0.5">{passedGradings}</p>
                            </div>
                            <div className="w-px h-8 bg-zinc-700" />
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Total Gradings</p>
                                <p className="text-lg font-bold mt-0.5">{totalGradings}</p>
                            </div>
                            {nextRank && (
                                <>
                                    <div className="w-px h-8 bg-zinc-700" />
                                    <div>
                                        <p className="text-[9px] tracking-widest uppercase text-zinc-500">Next Rank</p>
                                        <p className="text-sm font-semibold mt-0.5 text-accent-gold">{nextRank.nameEn}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Belt progression */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
            >
                <h2 className="text-sm font-bold text-zinc-900 mb-5 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    Belt Progression Path
                </h2>

                <div className="space-y-2">
                    {allBeltRanks.map((belt: any, i: number) => {
                        const isCurrentRank = belt.nameEn === currentRank;
                        const isAchieved = i < currentIdx;
                        const isNext = i === currentIdx + 1;

                        return (
                            <motion.div
                                key={belt.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.04 }}
                                className={`flex items-center gap-4 p-3.5 rounded-xl transition-all ${
                                    isCurrentRank
                                        ? "bg-zinc-900 text-white shadow-lg"
                                        : isAchieved
                                        ? "bg-emerald-50/60 border border-emerald-100"
                                        : isNext
                                        ? "bg-amber-50/60 border border-amber-100 border-dashed"
                                        : "bg-zinc-50/50 opacity-50"
                                }`}
                            >
                                {/* Belt color swatch */}
                                <div
                                    className={`w-7 h-7 rounded-lg flex-shrink-0 border ${
                                        belt.nameEn === "White Belt" ? "border-zinc-300" : "border-transparent"
                                    }`}
                                    style={{ backgroundColor: belt.colorHex }}
                                />

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${isCurrentRank ? "text-white" : isAchieved ? "text-emerald-800" : "text-zinc-700"}`}>
                                        {belt.nameEn}
                                    </p>
                                    <p className={`text-xs ${isCurrentRank ? "text-zinc-400" : "text-zinc-500"}`}>
                                        {belt.kyuDan ?? ""}{belt.requiredKata ? ` · ${belt.requiredKata}` : ""}
                                    </p>
                                </div>

                                {/* Status badge */}
                                <div className="flex-shrink-0">
                                    {isCurrentRank && (
                                        <span className="text-[10px] font-bold tracking-widest uppercase bg-accent-red px-2.5 py-1 rounded-full">Current</span>
                                    )}
                                    {isAchieved && (
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                    )}
                                    {isNext && (
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">Next</span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {nextRank && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-xs font-bold text-amber-800 mb-1">Required for {nextRank.nameEn}</p>
                        {nextRank.requiredKata && (
                            <p className="text-xs text-amber-700">Kata: <span className="font-semibold">{nextRank.requiredKata}</span></p>
                        )}
                        <Link
                            href="/portal/grading"
                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-accent-red hover:text-accent-gold transition-colors"
                        >
                            Apply for grading exam <ChevronRight size={12} />
                        </Link>
                    </div>
                )}
            </motion.div>

            {/* Grading History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
            >
                <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    Full Grading History
                </h2>

                {gradings.length > 0 ? (
                    <div className="space-y-2">
                        {gradings.map((g: any, i: number) => (
                            <div key={g.id ?? i} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors">
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
                                            {g.fromRank?.nameEn ?? "—"} → {g.toRank?.nameEn ?? "—"}
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
            </motion.div>
        </div>
    );
}
