"use client";

import { motion } from "motion/react";
import TiltCard from "./tilt-card";
import { FileText, Download, Eye, Award, Calendar, CheckCircle2, Info } from "lucide-react";

interface Props {
    member: any;
    gradings: any[];
}

const beltGradient: Record<string, string> = {
    "White Belt":  "from-zinc-100 to-zinc-200",
    "Yellow Belt": "from-yellow-300 to-yellow-400",
    "Orange Belt": "from-orange-400 to-orange-500",
    "Green Belt":  "from-green-500 to-green-600",
    "Blue Belt":   "from-blue-500 to-blue-600",
    "Brown Belt":  "from-amber-700 to-amber-800",
    "Black Belt":  "from-zinc-800 to-zinc-950",
};

const beltTextColor: Record<string, string> = {
    "White Belt":  "text-zinc-700",
    "Yellow Belt": "text-zinc-900",
    "Orange Belt": "text-white",
    "Green Belt":  "text-white",
    "Blue Belt":   "text-white",
    "Brown Belt":  "text-white",
    "Black Belt":  "text-white",
};

export default function CertificatesClient({ member, gradings }: Props) {
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Certificates</h1>
                <p className="text-zinc-500 mt-1 text-sm">Download and verify your official JKA grading certificates.</p>
            </div>

            {/* Info banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700"
            >
                <Info size={17} className="flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-semibold">About JKA Certificates</p>
                    <p className="mt-0.5 opacity-80 text-xs leading-relaxed">
                        Certificates are generated automatically after your grading result is recorded by your instructor.
                        Each certificate includes a unique QR code for international verification.
                    </p>
                </div>
            </motion.div>

            {gradings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gradings.map((g: any, i: number) => {
                        const rankName = g.toRank?.nameEn ?? "Belt";
                        const gradient = beltGradient[rankName] ?? "from-zinc-700 to-zinc-900";
                        const textColor = beltTextColor[rankName] ?? "text-white";

                        return (
                            <TiltCard
                                key={g.id ?? i}
                                delay={0.1 + i * 0.06}
                                className="overflow-hidden"
                            >
                                {/* Certificate top banner */}
                                <div className={`bg-gradient-to-br ${gradient} p-6`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className={`text-[9px] tracking-[0.3em] uppercase font-bold opacity-70 ${textColor}`}>
                                                JKA Bangladesh
                                            </p>
                                            <p className={`text-[9px] tracking-widest uppercase opacity-50 mt-0.5 ${textColor}`}>
                                                Official Certificate
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-lg bg-white/20`}>
                                            <Award size={18} className={textColor} />
                                        </div>
                                    </div>
                                    <h3 className={`text-xl font-bold mt-4 ${textColor}`}>{rankName}</h3>
                                    <p className={`text-sm opacity-80 mt-0.5 ${textColor}`}>
                                        {g.toRank?.kyuDan ?? ""}
                                    </p>
                                </div>

                                {/* Certificate details */}
                                <div className="bg-white p-5 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Recipient</span>
                                        <span className="font-semibold text-zinc-900">{member?.fullName ?? "—"}</span>
                                    </div>
                                    {g.gradedAt && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-500">Date</span>
                                            <span className="font-medium text-zinc-700">
                                                {new Date(g.gradedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    )}
                                    {g.gradingEvent?.title && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-500">Exam</span>
                                            <span className="font-medium text-zinc-700 text-right text-xs max-w-[60%] truncate">{g.gradingEvent.title}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Result</span>
                                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                                            <CheckCircle2 size={14} /> PASSED
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-zinc-100">
                                        {g.certificateUrl ? (
                                            <>
                                                {g.certificateRequests?.[0]?.id && (
                                                    <a
                                                        href={`/certificates/${g.certificateRequests[0].id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 border border-zinc-200 hover:border-accent-red hover:text-accent-red text-zinc-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors"
                                                        title="Preview certificate"
                                                    >
                                                        <Eye size={14} />
                                                    </a>
                                                )}
                                                <a
                                                    href={g.certificateUrl}
                                                    download
                                                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                                                >
                                                    <Download size={14} /> Download
                                                </a>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 border border-zinc-100 text-zinc-400 text-xs font-medium py-2.5 rounded-xl">
                                                <FileText size={14} />
                                                Certificate being prepared...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TiltCard>
                        );
                    })}
                </div>
            ) : (
                <TiltCard delay={0.1} className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <FileText size={40} className="text-zinc-200 mb-4" />
                        <p className="text-zinc-600 font-semibold">No certificates yet</p>
                        <p className="text-zinc-400 text-sm mt-2 max-w-xs">
                            Certificates are issued after you pass a grading exam. Your instructor will record the result and the certificate will appear here.
                        </p>
                    </div>
                </TiltCard>
            )}
        </div>
    );
}
