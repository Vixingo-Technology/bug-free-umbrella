"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import {
    Award, Calendar, MapPin, CheckCircle2, Clock,
    XCircle, ChevronRight, Loader2, AlertCircle, FileText,
} from "lucide-react";
import { applyForGradingAction, withdrawApplicationAction } from "@/app/portal/grading/actions";

interface Props {
    member: any;
    gradingEvents: any[];
    myApplications: any[];
    myGradings: any[];
    appliedEventIds: string[];
    userId: string;
}

const statusColors: Record<string, string> = {
    SUBMITTED: "bg-amber-50 text-amber-600",
    APPROVED:  "bg-emerald-50 text-emerald-600",
    REJECTED:  "bg-red-50 text-red-600",
};

export default function GradingClient({ member, gradingEvents, myApplications, myGradings, appliedEventIds, userId }: Props) {
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleApply(eventId: string) {
        setFeedback(null);
        startTransition(async () => {
            const res = await applyForGradingAction(eventId, notes);
            if (res.error) {
                setFeedback({ type: "error", message: res.error });
            } else {
                setFeedback({ type: "success", message: "Application submitted successfully!" });
                setApplyingTo(null);
                setNotes("");
            }
        });
    }

    function handleWithdraw(appId: string) {
        setFeedback(null);
        startTransition(async () => {
            const res = await withdrawApplicationAction(appId);
            if (res.error) {
                setFeedback({ type: "error", message: res.error });
            } else {
                setFeedback({ type: "success", message: "Application withdrawn." });
            }
        });
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Grading</h1>
                <p className="text-zinc-500 mt-1 text-sm">Apply for grading exams and track your results.</p>
            </div>

            {/* Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
                            feedback.type === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-red-50 border-red-200 text-red-700"
                        }`}
                    >
                        {feedback.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                        {feedback.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* My Applications */}
            <TiltCard delay={0.1} className="p-6">
                <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-purple-500" />
                    My Applications
                </h2>

                {myApplications.length > 0 ? (
                    <div className="space-y-2">
                        {myApplications.map((app: any) => (
                            <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                        {app.gradingEvent?.title ?? "Grading Exam"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {app.gradingEvent?.eventDate && (
                                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                <Calendar size={11} />
                                                {new Date(app.gradingEvent.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </p>
                                        )}
                                        {app.targetRank?.nameEn && (
                                            <p className="text-xs text-zinc-500">Target: <span className="font-medium">{app.targetRank.nameEn}</span></p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${statusColors[app.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                                        {app.status}
                                    </span>
                                    {app.status === "SUBMITTED" && (
                                        <button
                                            onClick={() => handleWithdraw(app.id)}
                                            disabled={isPending}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                                        >
                                            Withdraw
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText size={30} className="text-zinc-200 mb-2" />
                        <p className="text-zinc-500 text-sm">No applications submitted yet.</p>
                    </div>
                )}
            </TiltCard>

            {/* Upcoming Grading Events */}
            <TiltCard delay={0.15} className="p-6">
                <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    Upcoming Grading Exams
                </h2>

                {gradingEvents.length > 0 ? (
                    <div className="space-y-3">
                        {gradingEvents.map((ev: any) => {
                            const hasApplied = appliedEventIds.includes(ev.id);
                            const isOpen = applyingTo === ev.id;
                            const deadline = ev.registrationDeadline ? new Date(ev.registrationDeadline) : null;
                            const isPastDeadline = deadline ? deadline < new Date() : false;

                            return (
                                <div key={ev.id} className="border border-zinc-100 rounded-xl overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-zinc-900">{ev.title}</p>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                                </span>
                                                {ev.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={11} />
                                                        {ev.location}
                                                    </span>
                                                )}
                                                {ev.targetRank && (
                                                    <span className="font-medium text-zinc-700">Target: {ev.targetRank.nameEn}</span>
                                                )}
                                            </div>
                                            {deadline && (
                                                <p className={`text-xs mt-1 font-medium ${isPastDeadline ? "text-red-500" : "text-amber-600"}`}>
                                                    {isPastDeadline ? "Registration closed" : `Register by ${deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0">
                                            {hasApplied ? (
                                                <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Applied
                                                </span>
                                            ) : isPastDeadline ? (
                                                <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-400">
                                                    Closed
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setApplyingTo(isOpen ? null : ev.id)}
                                                    className="text-sm font-bold text-accent-red hover:text-white hover:bg-accent-red border border-accent-red/30 px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                                                >
                                                    {isOpen ? "Cancel" : "Apply"}
                                                    {!isOpen && <ChevronRight size={13} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Apply form */}
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t border-zinc-100"
                                            >
                                                <div className="p-4 bg-zinc-50/50 space-y-3">
                                                    <div>
                                                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                                                            Additional Notes (optional)
                                                        </label>
                                                        <textarea
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            rows={2}
                                                            placeholder="e.g. Any special requirements or notes for the examiner..."
                                                            className="w-full text-sm bg-white border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-red resize-none"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleApply(ev.id)}
                                                        disabled={isPending}
                                                        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                                                    >
                                                        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                                                        Submit Application
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Calendar size={32} className="text-zinc-200 mb-3" />
                        <p className="text-zinc-500 text-sm">No upcoming grading exams scheduled.</p>
                        <p className="text-zinc-400 text-xs mt-1">Check back soon or contact your instructor.</p>
                    </div>
                )}
            </TiltCard>

            {/* Grading Results */}
            <TiltCard delay={0.2} className="p-6">
                <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    Grading Results
                </h2>

                {myGradings.length > 0 ? (
                    <div className="space-y-2">
                        {myGradings.map((g: any, i: number) => (
                            <div key={g.id ?? i} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    {g.result === "PASSED" ? (
                                        <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
                                    ) : g.result === "FAILED" ? (
                                        <XCircle size={17} className="text-red-400 flex-shrink-0" />
                                    ) : (
                                        <Clock size={17} className="text-amber-500 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 truncate">
                                            {g.fromRank?.nameEn ?? "—"} → {g.toRank?.nameEn ?? "—"}
                                        </p>
                                        {g.gradedAt && (
                                            <p className="text-xs text-zinc-500">
                                                {new Date(g.gradedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${
                                        g.result === "PASSED" ? "bg-emerald-50 text-emerald-600" :
                                        g.result === "FAILED" ? "bg-red-50 text-red-600" :
                                        "bg-amber-50 text-amber-600"
                                    }`}>
                                        {g.result ?? "PENDING"}
                                    </span>
                                    {g.certificateUrl && (
                                        <a
                                            href={g.certificateUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-accent-red hover:text-accent-gold font-bold transition-colors underline underline-offset-2"
                                        >
                                            Certificate
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Award size={30} className="text-zinc-200 mb-2" />
                        <p className="text-zinc-500 text-sm">No grading results yet.</p>
                    </div>
                )}
            </TiltCard>
        </div>
    );
}
