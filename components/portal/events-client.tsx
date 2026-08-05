"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import {
    CalendarDays, MapPin, Users, CheckCircle2,
    AlertCircle, Loader2, ChevronRight, Ticket,
} from "lucide-react";
import { registerForEventAction, cancelEventRegistrationAction } from "@/app/portal/events/actions";

interface Props {
    upcomingEvents: any[];
    pastEvents: any[];
    myRegistrations: string[];
    userId: string;
}

const typeColors: Record<string, string> = {
    TOURNAMENT:    "bg-red-50 text-red-600",
    SEMINAR:       "bg-purple-50 text-purple-600",
    TRAINING_CAMP: "bg-blue-50 text-blue-600",
    // Legacy values still present on old rows.
    BELT_TEST:     "bg-amber-50 text-amber-600",
    OTHER:         "bg-zinc-100 text-zinc-600",
};

export default function EventsClient({ upcomingEvents, pastEvents, myRegistrations, userId }: Props) {
    const [registrations, setRegistrations] = useState<Set<string>>(new Set(myRegistrations));
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function handleRegister(eventId: string) {
        setLoadingId(eventId);
        setFeedback(null);
        startTransition(async () => {
            const res = await registerForEventAction(eventId);
            if (res.redirectTo) {
                // Premium event or extra details needed — full form / payment.
                router.push(res.redirectTo);
                return;
            }
            setLoadingId(null);
            if (res.error) {
                setFeedback({ type: "error", message: res.error });
            } else {
                setRegistrations(prev => new Set([...prev, eventId]));
                setFeedback({ type: "success", message: "Successfully registered!" });
            }
        });
    }

    function handleCancel(eventId: string) {
        setLoadingId(eventId);
        setFeedback(null);
        startTransition(async () => {
            const res = await cancelEventRegistrationAction(eventId);
            setLoadingId(null);
            if (res.error) {
                setFeedback({ type: "error", message: res.error });
            } else {
                setRegistrations(prev => { const s = new Set(prev); s.delete(eventId); return s; });
                setFeedback({ type: "success", message: "Registration cancelled." });
            }
        });
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Events</h1>
                <p className="text-zinc-500 mt-1 text-sm">Register for tournaments, seminars, and training camps.</p>
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

            {/* Upcoming Events */}
            <div>
                <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-3">Upcoming Events</h2>
                {upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                        {upcomingEvents.map((ev: any, i: number) => {
                            const isRegistered = registrations.has(ev.id);
                            const isLoading = loadingId === ev.id && isPending;
                            const isFull = ev.maxCapacity && (ev.rsvpCount ?? 0) >= ev.maxCapacity;
                            const category = ev.category ?? "OTHER";

                            return (
                                <TiltCard
                                    key={ev.id}
                                    delay={0.1 + i * 0.05}
                                    className="p-5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                        {/* Date block */}
                                        <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-zinc-900 rounded-xl flex flex-col items-center justify-center text-white">
                                            <p className="text-lg font-bold leading-none">
                                                {new Date(ev.eventDate).getDate()}
                                            </p>
                                            <p className="text-[9px] tracking-widest uppercase opacity-70 mt-0.5">
                                                {new Date(ev.eventDate).toLocaleDateString("en-GB", { month: "short" })}
                                            </p>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${typeColors[category] ?? typeColors.OTHER}`}>
                                                    {category.replace("_", " ")}
                                                </span>
                                                {ev.isPremium ? (
                                                    <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                                                        <Ticket size={10} /> Paid
                                                    </span>
                                                ) : null}
                                                {isRegistered && (
                                                    <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Registered
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-base font-bold text-zinc-900 mt-1.5">{ev.title}</h3>
                                            {ev.description && (
                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{ev.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-zinc-500">
                                                {ev.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={11} /> {ev.location}
                                                    </span>
                                                )}
                                                {ev.maxCapacity && (
                                                    <span className="flex items-center gap-1">
                                                        <Users size={11} />
                                                        {ev.rsvpCount ?? 0} / {ev.maxCapacity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="flex-shrink-0 self-center sm:self-start sm:mt-1">
                                            {isRegistered ? (
                                                <button
                                                    onClick={() => handleCancel(ev.id)}
                                                    disabled={isLoading}
                                                    className="text-sm font-bold text-zinc-500 hover:text-red-600 border border-zinc-200 hover:border-red-200 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                                    Cancel
                                                </button>
                                            ) : isFull ? (
                                                <span className="text-xs font-bold text-zinc-400 border border-zinc-100 px-4 py-2 rounded-xl">
                                                    Full
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegister(ev.id)}
                                                    disabled={isLoading}
                                                    className="text-sm font-bold text-white bg-zinc-900 hover:bg-accent-red px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                                    Register
                                                    {!isLoading && <ChevronRight size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </TiltCard>
                            );
                        })}
                    </div>
                ) : (
                    <TiltCard className="p-10">
                        <div className="flex flex-col items-center justify-center text-center">
                            <CalendarDays size={36} className="text-zinc-200 mb-3" />
                            <p className="text-zinc-500 text-sm">No upcoming events at the moment.</p>
                            <p className="text-zinc-400 text-xs mt-1">Check back soon for tournaments, seminars, and training camps.</p>
                        </div>
                    </TiltCard>
                )}
            </div>

            {/* Past Events */}
            {pastEvents.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-3">Past Events</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pastEvents.map((ev: any, i: number) => {
                            const category = ev.category ?? "OTHER";
                            return (
                            <TiltCard
                                key={ev.id}
                                delay={0.1 + i * 0.04}
                                className="p-4 opacity-70"
                            >
                                <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${typeColors[category] ?? typeColors.OTHER}`}>
                                    {category.replace("_", " ")}
                                </span>
                                <p className="text-sm font-semibold text-zinc-800 mt-2">{ev.title}</p>
                                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                    <CalendarDays size={11} />
                                    {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </TiltCard>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
