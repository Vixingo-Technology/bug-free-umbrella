"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Bell,
    Info,
    AlertTriangle,
    CheckCircle2,
    Gift,
    Award,
    CreditCard,
    CalendarDays,
    FileText,
    ChevronRight,
    Check,
    Filter,
    Search,
    X,
} from "lucide-react";
import Link from "next/link";
import {
    markNotificationReadAction,
    markAllReadAction,
    loadMoreNotificationsAction,
} from "@/app/portal/notifications/actions";

interface Props {
    notifications: any[];
    userId: string;
    totalCount: number;
    pageSize: number;
}

type TypeKey =
    | "INFO"
    | "WARNING"
    | "SUCCESS"
    | "PAYMENT"
    | "GRADING"
    | "EVENT"
    | "RENEWAL"
    | "CERTIFICATE"
    // Legacy / future-proof
    | "REMINDER"
    | "ALERT"
    | "WELCOME";

const typeConfig: Record<
    TypeKey,
    { icon: any; color: string; bg: string; ring: string; label: string }
> = {
    INFO:        { icon: Info,         color: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-100",    label: "Info" },
    WARNING:     { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50",   ring: "ring-amber-100",   label: "Warning" },
    SUCCESS:     { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", label: "Success" },
    PAYMENT:     { icon: CreditCard,   color: "text-violet-600",  bg: "bg-violet-50",  ring: "ring-violet-100",  label: "Payment" },
    GRADING:     { icon: Award,        color: "text-rose-600",    bg: "bg-rose-50",    ring: "ring-rose-100",    label: "Grading" },
    EVENT:       { icon: CalendarDays, color: "text-sky-600",     bg: "bg-sky-50",     ring: "ring-sky-100",     label: "Event" },
    RENEWAL:     { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50",   ring: "ring-amber-100",   label: "Renewal" },
    CERTIFICATE: { icon: FileText,     color: "text-indigo-600",  bg: "bg-indigo-50",  ring: "ring-indigo-100",  label: "Certificate" },
    REMINDER:    { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50",   ring: "ring-amber-100",   label: "Reminder" },
    ALERT:       { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",     ring: "ring-red-100",     label: "Alert" },
    WELCOME:     { icon: Gift,         color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", label: "Welcome" },
};

function cfgFor(type: string) {
    return typeConfig[(type as TypeKey)] ?? typeConfig.INFO;
}

type ReadFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

function isWithin(date: Date, filter: DateFilter): boolean {
    if (filter === "all") return true;
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (filter === "today") {
        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    }
    if (filter === "week") return diffDays <= 7;
    if (filter === "month") return diffDays <= 31;
    return true;
}

function relativeTime(d: Date): string {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function NotificationsClient({
    notifications: initialNotifications,
    userId: _userId,
    totalCount,
    pageSize,
}: Props) {
    const [notifications, setNotifications] = useState<any[]>(initialNotifications);
    const [readIds, setReadIds] = useState<Set<string>>(
        new Set(initialNotifications.filter((n) => n.isRead).map((n) => n.id))
    );
    const [isPending, startTransition] = useTransition();
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [readFilter, setReadFilter] = useState<ReadFilter>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const hasMore = notifications.length < totalCount;

    const unreadCount = useMemo(
        () => notifications.filter((n) => !readIds.has(n.id)).length,
        [notifications, readIds]
    );

    const availableTypes = useMemo(() => {
        const set = new Set<string>();
        notifications.forEach((n) => n.type && set.add(n.type));
        return Array.from(set);
    }, [notifications]);

    const filtered = useMemo(() => {
        return notifications.filter((n) => {
            const isRead = readIds.has(n.id);
            if (readFilter === "unread" && isRead) return false;
            if (readFilter === "read" && !isRead) return false;
            if (typeFilter !== "all" && n.type !== typeFilter) return false;
            if (!isWithin(new Date(n.createdAt), dateFilter)) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                const hay = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [notifications, readIds, readFilter, typeFilter, dateFilter, search]);

    function handleMarkRead(id: string) {
        if (readIds.has(id)) return;
        setReadIds((prev) => new Set([...prev, id]));
        window.dispatchEvent(
            new CustomEvent("jka:notifications-read", { detail: { delta: 1 } })
        );
        startTransition(async () => {
            await markNotificationReadAction(id);
        });
    }

    function handleMarkAllRead() {
        if (unreadCount === 0) return;
        setReadIds(new Set(notifications.map((n) => n.id)));
        window.dispatchEvent(
            new CustomEvent("jka:notifications-read", { detail: { all: true } })
        );
        startTransition(async () => {
            await markAllReadAction();
        });
    }

    async function handleLoadMore() {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        setLoadMoreError(null);
        try {
            const res = await loadMoreNotificationsAction(notifications.length, pageSize);
            if (res.error) {
                setLoadMoreError(res.error);
            } else if (res.notifications?.length) {
                const existing = new Set(notifications.map((n) => n.id));
                const fresh = res.notifications.filter((n: any) => !existing.has(n.id));
                setNotifications((prev) => [...prev, ...fresh]);
                setReadIds((prev) => {
                    const next = new Set(prev);
                    fresh.forEach((n: any) => {
                        if (n.isRead) next.add(n.id);
                    });
                    return next;
                });
            }
        } catch {
            setLoadMoreError("Failed to load more notifications.");
        } finally {
            setIsLoadingMore(false);
        }
    }

    const hasActiveFilters =
        readFilter !== "all" ||
        typeFilter !== "all" ||
        dateFilter !== "all" ||
        search.trim().length > 0;

    return (
        <div className="space-y-5 max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent-red text-white text-[11px] font-bold">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <p className="text-zinc-500 mt-1 text-sm">
                        {unreadCount > 0
                            ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                            : "All caught up — nothing new."}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowFilters((v) => !v)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                            showFilters || hasActiveFilters
                                ? "bg-zinc-900 text-white border border-zinc-900"
                                : "text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400"
                        }`}
                    >
                        <Filter size={13} />
                        Filter
                        {hasActiveFilters && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-red ml-0.5" />
                        )}
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                            <Check size={13} /> Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <AnimatePresence initial={false}>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Search notifications…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-zinc-200 focus:border-zinc-400 focus:outline-none bg-white"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-zinc-700"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Status */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mr-1">
                                    Status
                                </span>
                                {(["all", "unread", "read"] as ReadFilter[]).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setReadFilter(opt)}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                                            readFilter === opt
                                                ? "bg-zinc-900 text-white"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                    >
                                        {opt[0].toUpperCase() + opt.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Type */}
                            {availableTypes.length > 1 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mr-1">
                                        Type
                                    </span>
                                    <button
                                        onClick={() => setTypeFilter("all")}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                                            typeFilter === "all"
                                                ? "bg-zinc-900 text-white"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                    >
                                        All
                                    </button>
                                    {availableTypes.map((t) => {
                                        const cfg = cfgFor(t);
                                        const active = typeFilter === t;
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => setTypeFilter(t)}
                                                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                                                    active
                                                        ? "bg-zinc-900 text-white"
                                                        : `${cfg.bg} ${cfg.color} hover:opacity-80`
                                                }`}
                                            >
                                                <cfg.icon size={11} />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Date */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mr-1">
                                    When
                                </span>
                                {(
                                    [
                                        ["all", "Anytime"],
                                        ["today", "Today"],
                                        ["week", "Past 7 days"],
                                        ["month", "Past 30 days"],
                                    ] as [DateFilter, string][]
                                ).map(([opt, label]) => (
                                    <button
                                        key={opt}
                                        onClick={() => setDateFilter(opt)}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                                            dateFilter === opt
                                                ? "bg-zinc-900 text-white"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {hasActiveFilters && (
                                <div className="pt-1">
                                    <button
                                        onClick={() => {
                                            setReadFilter("all");
                                            setTypeFilter("all");
                                            setDateFilter("all");
                                            setSearch("");
                                        }}
                                        className="text-xs font-semibold text-zinc-500 hover:text-accent-red transition-colors"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List */}
            {notifications.length === 0 ? (
                <EmptyState
                    title="No notifications yet"
                    body="Membership reminders, grading results, and event updates will appear here."
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    title="Nothing matches your filters"
                    body="Try clearing a filter or searching for something else."
                />
            ) : (
                <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                        {filtered.map((notif: any, i: number) => {
                            const isRead = readIds.has(notif.id);
                            const cfg = cfgFor(notif.type);
                            const Icon = cfg.icon;
                            const href = notif.link ?? notif.actionUrl ?? null;

                            return (
                                <motion.li
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        duration: 0.22,
                                        delay: Math.min(i * 0.02, 0.2),
                                        ease: "easeOut",
                                    }}
                                    onClick={() => !isRead && handleMarkRead(notif.id)}
                                    className={`group relative flex items-start gap-3 p-4 pl-5 rounded-2xl border transition-all cursor-pointer ${
                                        isRead
                                            ? "bg-white border-zinc-100 hover:border-zinc-200"
                                            : "bg-white border-zinc-200 hover:border-zinc-300 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]"
                                    }`}
                                >
                                    {/* Unread accent bar */}
                                    {!isRead && (
                                        <span
                                            aria-hidden
                                            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-accent-red"
                                        />
                                    )}

                                    {/* Icon */}
                                    <div
                                        className={`p-2.5 rounded-xl flex-shrink-0 ring-1 ${cfg.bg} ${cfg.ring}`}
                                    >
                                        <Icon size={15} className={cfg.color} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={`text-sm leading-snug ${
                                                    isRead
                                                        ? "font-medium text-zinc-700"
                                                        : "font-bold text-zinc-900"
                                                }`}
                                            >
                                                {notif.title}
                                            </p>
                                            <time
                                                dateTime={new Date(notif.createdAt).toISOString()}
                                                title={new Date(notif.createdAt).toLocaleString("en-GB")}
                                                className={`text-[11px] flex-shrink-0 ${
                                                    isRead ? "text-zinc-400" : "text-zinc-500"
                                                }`}
                                            >
                                                {relativeTime(new Date(notif.createdAt))}
                                            </time>
                                        </div>
                                        <p
                                            className={`text-xs mt-1 leading-relaxed ${
                                                isRead ? "text-zinc-500" : "text-zinc-600"
                                            }`}
                                        >
                                            {notif.message}
                                        </p>

                                        {/* Secondary action */}
                                        <div className="flex items-center gap-3 mt-2.5">
                                            <span
                                                className={`text-[10px] font-bold tracking-wide uppercase ${cfg.color} opacity-75`}
                                            >
                                                {cfg.label}
                                            </span>
                                            {href && (
                                                <Link
                                                    href={href}
                                                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-accent-red hover:text-accent-gold transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isRead) handleMarkRead(notif.id);
                                                    }}
                                                >
                                                    View <ChevronRight size={11} />
                                                </Link>
                                            )}
                                            {!isRead && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkRead(notif.id);
                                                    }}
                                                    className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-900 transition-colors ml-auto"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}

            {/* Load more */}
            {notifications.length > 0 && hasMore && (
                <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    >
                        {isLoadingMore ? "Loading…" : "Load more"}
                    </button>
                    <span className="text-[11px] text-zinc-400">
                        Showing {notifications.length} of {totalCount}
                    </span>
                    {loadMoreError && (
                        <span className="text-[11px] text-accent-red">{loadMoreError}</span>
                    )}
                </div>
            )}
        </div>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-12">
            <div className="flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                    <Bell size={22} className="text-zinc-300" />
                </div>
                <p className="text-zinc-700 font-semibold">{title}</p>
                <p className="text-zinc-400 text-sm mt-2 max-w-xs">{body}</p>
            </div>
        </div>
    );
}
