"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
    Check,
    ChevronRight,
    ArrowRightLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
    markAllReadAction,
    markNotificationReadAction,
} from "@/app/portal/notifications/actions";

type Notif = {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    link: string | null;
    created_at: string;
};

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    INFO: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
    WARNING: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    SUCCESS: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    PAYMENT: { icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50" },
    GRADING: { icon: Award, color: "text-rose-600", bg: "bg-rose-50" },
    EVENT: { icon: CalendarDays, color: "text-sky-600", bg: "bg-sky-50" },
    RENEWAL: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    CERTIFICATE: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
    TRANSFER: { icon: ArrowRightLeft, color: "text-teal-700", bg: "bg-teal-50" },
    REMINDER: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    ALERT: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    WELCOME: { icon: Gift, color: "text-emerald-600", bg: "bg-emerald-50" },
};

function cfgFor(type: string) {
    return typeConfig[type] ?? typeConfig.INFO;
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
    });
}

interface Props {
    userId: string;
    unreadCount: number;
    onUnreadChange: (next: number) => void;
    align?: "left" | "right";
    iconSize?: number;
    /** Hide the icon button and only render the dropdown panel anchored to a custom trigger. */
    triggerless?: boolean;
}

export default function NotificationBell({
    userId,
    unreadCount,
    onUnreadChange,
    align = "right",
    iconSize = 18,
}: Props) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(false);
    const [pulse, setPulse] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (!open) return;
            const t = e.target as Node;
            if (
                panelRef.current &&
                !panelRef.current.contains(t) &&
                buttonRef.current &&
                !buttonRef.current.contains(t)
            ) {
                setOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Pulse the icon + refresh the open dropdown whenever portal-shell's
    // realtime subscription tells us a new notification landed.
    useEffect(() => {
        function onArrived(e: Event) {
            const row = (e as CustomEvent<{ row?: Notif | null }>).detail?.row;
            setPulse(true);
            window.setTimeout(() => setPulse(false), 1200);
            if (open) {
                // Cheap path: prepend the row we already got in the payload and
                // trim to 5. Avoids a roundtrip and keeps the panel live.
                if (row && row.id) {
                    setItems((prev) => {
                        const next = [row, ...prev.filter((n) => n.id !== row.id)];
                        return next.slice(0, 5);
                    });
                } else {
                    fetchLatest();
                }
            }
        }
        window.addEventListener("jka:notification-arrived", onArrived);
        return () => window.removeEventListener("jka:notification-arrived", onArrived);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function fetchLatest() {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("notifications")
                .select("id, title, message, type, is_read, link, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(5);
            setItems(data ?? []);
        } finally {
            setLoading(false);
        }
    }

    function toggle() {
        const next = !open;
        setOpen(next);
        if (next) fetchLatest();
    }

    async function markOneRead(id: string) {
        setItems((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        onUnreadChange(Math.max(0, unreadCount - 1));
        window.dispatchEvent(
            new CustomEvent("jka:notifications-read", { detail: { delta: 1 } })
        );
        await markNotificationReadAction(id);
    }

    async function markAll() {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        onUnreadChange(0);
        window.dispatchEvent(
            new CustomEvent("jka:notifications-read", { detail: { all: true } })
        );
        await markAllReadAction();
    }

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={toggle}
                aria-label="Notifications"
                aria-expanded={open}
                className={`relative px-2 pt-2 rounded-lg transition-colors ${open
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
            >
                {pulse && (
                    <span
                        aria-hidden
                        className="absolute inset-0 rounded-lg ring-2 ring-accent-red/40 animate-ping pointer-events-none"
                    />
                )}
                <motion.span
                    animate={pulse ? { rotate: [0, -12, 12, -8, 8, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="inline-block"
                >
                    <Bell size={iconSize} />
                </motion.span>
                {unreadCount > 0 && (
                    <motion.span
                        key={unreadCount}
                        initial={pulse ? { scale: 0.6 } : false}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-accent-red text-white text-[10px] font-bold ring-2 ring-white"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className={`absolute top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-zinc-200 shadow-xl shadow-zinc-900/5 z-50 overflow-hidden ${align === "right" ? "right-0" : "left-0"
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-zinc-900">
                                    Notifications
                                </span>
                                {unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[10px] font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAll}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                                >
                                    <Check size={11} /> Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="p-4 space-y-3">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-start gap-3 animate-pulse">
                                            <div className="w-9 h-9 rounded-xl bg-zinc-100" />
                                            <div className="flex-1 space-y-2 pt-1">
                                                <div className="h-3 w-3/4 rounded bg-zinc-100" />
                                                <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : items.length === 0 ? (
                                <div className="px-4 py-10 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                                        <Bell size={18} className="text-zinc-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-700">
                                        You&rsquo;re all caught up
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        New updates will show up here.
                                    </p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {items.map((n) => {
                                        const cfg = cfgFor(n.type);
                                        const Icon = cfg.icon;
                                        const isRead = n.is_read;
                                        const inner = (
                                            <div
                                                className={`relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${isRead
                                                    ? "hover:bg-zinc-50"
                                                    : "bg-accent-red/[0.025] hover:bg-accent-red/[0.05]"
                                                    }`}
                                                onClick={() => {
                                                    if (!isRead) markOneRead(n.id);
                                                }}
                                            >
                                                {!isRead && (
                                                    <span
                                                        aria-hidden
                                                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent-red"
                                                    />
                                                )}
                                                <div
                                                    className={`p-2 rounded-xl flex-shrink-0 ${cfg.bg}`}
                                                >
                                                    <Icon size={13} className={cfg.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p
                                                            className={`text-[13px] leading-snug truncate ${isRead
                                                                ? "font-medium text-zinc-700"
                                                                : "font-bold text-zinc-900"
                                                                }`}
                                                        >
                                                            {n.title}
                                                        </p>
                                                        {!isRead && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${isRead ? "text-zinc-500" : "text-zinc-600"
                                                            }`}
                                                    >
                                                        {n.message}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400 mt-1">
                                                        {relativeTime(new Date(n.created_at))}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                        return (
                                            <li key={n.id}>
                                                {n.link ? (
                                                    <Link
                                                        href={n.link}
                                                        onClick={() => {
                                                            if (!isRead) markOneRead(n.id);
                                                            setOpen(false);
                                                        }}
                                                        className="block"
                                                    >
                                                        {inner}
                                                    </Link>
                                                ) : (
                                                    inner
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
                            <Link
                                href="/portal/notifications"
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center gap-1 text-xs font-bold text-zinc-700 hover:text-accent-red transition-colors"
                            >
                                View all notifications <ChevronRight size={12} />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
