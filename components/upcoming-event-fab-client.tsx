"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MapPin, X } from "lucide-react";

export type FabEvent = {
    id: string;
    title: string;
    eventDate: string; // ISO
    location: string | null;
    category: "SEMINAR" | "TRAINING_CAMP" | "TOURNAMENT" | "BELT_TEST" | "OTHER";
    dojoName: string | null;
};

const CATEGORY_LABEL: Record<FabEvent["category"], string> = {
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    TOURNAMENT: "Tournament",
    // Legacy values still present on old rows.
    BELT_TEST: "Belt Test",
    OTHER: "Event",
};

function formatShort(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    });
}

function daysUntil(iso: string) {
    const now = new Date();
    const target = new Date(iso);
    const ms = target.getTime() - now.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
}

type Mode = "pill" | "icon" | "card";

export default function UpcomingEventFabClient({
    events,
}: {
    events: FabEvent[];
}) {
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<Mode>("pill");
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 1200);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!mounted || mode !== "pill") return;
        const t = setTimeout(() => setMode("icon"), 3500);
        return () => clearTimeout(t);
    }, [mounted, mode]);

    if (dismissed || events.length === 0) return null;

    const count = events.length;
    const pluralLabel = count === 1 ? "See upcoming event" : "See upcoming events";

    return (
        <AnimatePresence>
            {mounted && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="fixed bottom-6 right-6 z-[60] flex items-end justify-end"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {mode === "card" ? (
                            <motion.div
                                key="card"
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="w-[340px] sm:w-[380px] bg-white border border-zinc-200 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3 bg-accent-red text-white">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                        </span>
                                        <span className="text-[10px] tracking-[0.3em] uppercase font-bold">
                                            Upcoming Events
                                        </span>
                                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">
                                            {count}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={() => setMode("icon")}
                                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <ul className="max-h-[420px] overflow-y-auto divide-y divide-zinc-100">
                                    {events.map((event) => (
                                        <li key={event.id}>
                                            <Link
                                                href={`/events/${event.id}`}
                                                className="block px-4 py-3 hover:bg-zinc-50 transition-colors group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="shrink-0 text-center min-w-[42px] pt-0.5">
                                                        <div className="text-lg font-bold text-zinc-900 leading-none">
                                                            {new Date(
                                                                event.eventDate,
                                                            ).toLocaleDateString(
                                                                "en-GB",
                                                                { day: "2-digit" },
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] tracking-widest font-bold text-zinc-400 mt-1">
                                                            {new Date(event.eventDate)
                                                                .toLocaleDateString(
                                                                    "en-GB",
                                                                    { month: "short" },
                                                                )
                                                                .toUpperCase()}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="text-[9px] tracking-widest uppercase font-bold px-1.5 py-0.5 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                                                                {CATEGORY_LABEL[event.category]}
                                                            </span>
                                                            <span className="text-[9px] tracking-widest uppercase font-bold text-accent-red">
                                                                {daysUntil(event.eventDate)}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-zinc-900 group-hover:text-accent-red transition-colors line-clamp-2 leading-snug">
                                                            {event.title}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500 mt-1">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Calendar
                                                                    size={10}
                                                                    className="text-accent-red shrink-0"
                                                                />
                                                                {formatShort(
                                                                    event.eventDate,
                                                                )}
                                                            </span>
                                                            {event.location && (
                                                                <span className="inline-flex items-center gap-1 min-w-0">
                                                                    <MapPin
                                                                        size={10}
                                                                        className="text-accent-red shrink-0"
                                                                    />
                                                                    <span className="truncate">
                                                                        {event.location}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href="/events"
                                    className="block text-center px-4 py-3 border-t border-zinc-100 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red hover:bg-zinc-50 transition-colors"
                                >
                                    View all events
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="pill-or-icon"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                className="relative flex items-center"
                            >
                                <motion.button
                                    type="button"
                                    onClick={() => setMode("card")}
                                    aria-label={`${pluralLabel} (${count})`}
                                    animate={{ width: mode === "pill" ? 240 : 56 }}
                                    transition={{
                                        duration: 0.55,
                                        ease: [0.4, 0, 0.2, 1],
                                    }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative flex items-center h-14 rounded-full bg-accent-red text-white shadow-[0_10px_30px_rgba(196,30,58,0.45)] cursor-pointer overflow-hidden"
                                >
                                    {mode === "icon" && (
                                        <>
                                            <span
                                                aria-hidden
                                                className="absolute inset-0 rounded-full bg-accent-red animate-ping opacity-40"
                                            />
                                            <span
                                                aria-hidden
                                                className="absolute -inset-1 rounded-full border border-accent-red/40"
                                            />
                                        </>
                                    )}

                                    <span className="relative flex items-center justify-center h-14 w-14 shrink-0">
                                        <Calendar size={22} />
                                    </span>

                                    <AnimatePresence initial={false}>
                                        {mode === "pill" && (
                                            <motion.span
                                                key="label"
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -8 }}
                                                transition={{
                                                    duration: 0.25,
                                                    ease: "easeOut",
                                                }}
                                                className="relative pr-5 whitespace-nowrap text-sm font-semibold tracking-wide"
                                            >
                                                {pluralLabel}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {mode === "icon" && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{
                                                delay: 0.2,
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 20,
                                            }}
                                            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-white text-accent-red text-[10px] font-bold flex items-center justify-center border border-accent-red shadow-sm"
                                        >
                                            {count}
                                        </motion.span>
                                    )}
                                </motion.button>

                                <motion.button
                                    type="button"
                                    onClick={() => setDismissed(true)}
                                    aria-label="Dismiss"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5, duration: 0.2 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-zinc-200 text-zinc-500 hover:text-accent-red hover:border-accent-red shadow-sm flex items-center justify-center cursor-pointer z-10"
                                >
                                    <X size={12} />
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
