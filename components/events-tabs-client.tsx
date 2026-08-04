"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

export type EventItem = {
    id: string;
    title: string;
    eventDate: string; // ISO
    location: string | null;
    category: "SEMINAR" | "TRAINING_CAMP" | "TOURNAMENT" | "BELT_TEST" | "OTHER";
    dojoName: string | null;
};

export type AnnouncementItem = {
    id: string;
    title: string;
    body: string | null;
    link: string | null;
    publishedAt: string; // ISO
    dojoName: string | null;
};

const CATEGORY_LABEL: Record<EventItem["category"], string> = {
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    TOURNAMENT: "Tournament",
    // Legacy values still present on old rows.
    BELT_TEST: "Belt Test",
    OTHER: "Event",
};

function dayMonth(iso: string) {
    const d = new Date(iso);
    return {
        day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
        month: d
            .toLocaleDateString("en-GB", { month: "short" })
            .toUpperCase(),
    };
}

function formatFullDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

type Tab = "announcements" | "events";

export default function EventsTabsClient({
    heading,
    viewAllLabel,
    announcements,
    events,
}: {
    heading: string;
    viewAllLabel: string;
    announcements: AnnouncementItem[];
    events: EventItem[];
}) {
    const initial: Tab = announcements.length > 0 ? "announcements" : "events";
    const [tab, setTab] = useState<Tab>(initial);

    return (
        <section id="events" className="py-32 bg-bg-deep relative">
            {/* Floating red bubble backdrop */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
            >
                <div className="absolute top-1/2 -right-24 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-accent-red/40 blur-3xl animate-bubble-float-slow" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <h2 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                            {heading}
                        </h2>
                        <div className="h-px w-24 bg-accent-red mb-6"></div>
                    </div>
                    <Link
                        href="/events"
                        className="text-zinc-600 hover:text-accent-red uppercase tracking-widest text-xs font-semibold flex items-center gap-2 group transition-colors"
                    >
                        {viewAllLabel}
                        <ArrowRight
                            size={16}
                            className="group-hover:translate-x-2 transition-transform"
                        />
                    </Link>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-white/40 ring-1 ring-zinc-900/5 rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="flex items-center gap-2 p-4 border-b border-zinc-100/70 bg-white/30">
                        <TabPill
                            active={tab === "announcements"}
                            onClick={() => setTab("announcements")}
                            label="Announcements"
                        />
                        <TabPill
                            active={tab === "events"}
                            onClick={() => setTab("events")}
                            label="Events"
                        />
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {tab === "announcements" ? (
                            <motion.div
                                key="announcements"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                            >
                                {announcements.length === 0 ? (
                                    <EmptyState text="No announcements yet." />
                                ) : (
                                    <ul className="divide-y divide-zinc-200/40">
                                        {announcements.map((a) => {
                                            const { day, month } = dayMonth(
                                                a.publishedAt,
                                            );
                                            return (
                                                <li key={a.id}>
                                                    <Link
                                                        href={`/announcements/${a.id}`}
                                                        className="flex items-start gap-6 p-6 hover:bg-zinc-50/50 transition-colors group"
                                                    >
                                                        <div className="shrink-0 text-center min-w-[52px]">
                                                            <div className="text-2xl font-bold text-zinc-900 leading-none">
                                                                {day}
                                                            </div>
                                                            <div className="text-[10px] tracking-widest font-bold text-zinc-400 mt-1">
                                                                {month}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-base md:text-lg font-bold text-zinc-900 group-hover:text-accent-red transition-colors">
                                                                {a.title}
                                                            </h3>
                                                            {a.dojoName && (
                                                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                                                                    {a.dojoName}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="events"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                            >
                                {events.length === 0 ? (
                                    <EmptyState text="No upcoming events." />
                                ) : (
                                    <ul className="divide-y divide-zinc-200/40">
                                        {events.map((e) => {
                                            const { day, month } = dayMonth(
                                                e.eventDate,
                                            );
                                            return (
                                                <li key={e.id}>
                                                    <Link
                                                        href={`/events/${e.id}`}
                                                        className="flex items-start gap-6 p-6 hover:bg-zinc-50/50 transition-colors group"
                                                    >
                                                        <div className="shrink-0 text-center min-w-[52px]">
                                                            <div className="text-2xl font-bold text-zinc-900 leading-none">
                                                                {day}
                                                            </div>
                                                            <div className="text-[10px] tracking-widest font-bold text-zinc-400 mt-1">
                                                                {month}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                                                                    {CATEGORY_LABEL[e.category]}
                                                                </span>
                                                                {e.dojoName && (
                                                                    <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                                                        {e.dojoName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="text-base md:text-lg font-bold text-zinc-900 group-hover:text-accent-red transition-colors mb-2">
                                                                {e.title}
                                                            </h3>
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs text-zinc-500">
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Calendar
                                                                        size={12}
                                                                        className="text-accent-red"
                                                                    />
                                                                    {formatFullDate(e.eventDate)}
                                                                </span>
                                                                {e.location && (
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <MapPin
                                                                            size={12}
                                                                            className="text-accent-red"
                                                                        />
                                                                        {e.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}

function TabPill({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center px-5 py-2.5 text-xs font-bold tracking-widest uppercase rounded-full transition-colors ${
                active
                    ? "bg-accent-red text-white border border-accent-red"
                    : "bg-transparent text-zinc-700 border border-zinc-200 hover:border-accent-red hover:text-accent-red"
            }`}
        >
            {label}
        </button>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="p-12 text-center text-sm text-zinc-500">{text}</div>
    );
}
