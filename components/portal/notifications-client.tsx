"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import {
    Bell, Info, AlertTriangle, CheckCircle2, Gift,
    ChevronRight, Check,
} from "lucide-react";
import { markNotificationReadAction, markAllReadAction } from "@/app/portal/notifications/actions";
import Link from "next/link";

interface Props {
    notifications: any[];
    userId: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    INFO:     { icon: Info,          color: "text-blue-600",   bg: "bg-blue-50"   },
    REMINDER: { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50"  },
    ALERT:    { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50"    },
    WELCOME:  { icon: Gift,          color: "text-emerald-600",bg: "bg-emerald-50"},
};

export default function NotificationsClient({ notifications, userId }: Props) {
    const [readIds, setReadIds] = useState<Set<string>>(
        new Set(notifications.filter((n) => n.isRead).map((n) => n.id))
    );
    const [isPending, startTransition] = useTransition();

    const unread = notifications.filter((n) => !readIds.has(n.id));

    function handleMarkRead(id: string) {
        setReadIds(prev => new Set([...prev, id]));
        startTransition(async () => {
            await markNotificationReadAction(id);
        });
    }

    function handleMarkAllRead() {
        setReadIds(new Set(notifications.map((n) => n.id)));
        startTransition(async () => {
            await markAllReadAction();
        });
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Notifications</h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        {unread.length > 0 ? `${unread.length} unread message${unread.length > 1 ? "s" : ""}` : "All caught up!"}
                    </p>
                </div>
                {unread.length > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-3 py-2 rounded-xl transition-all flex-shrink-0 disabled:opacity-50"
                    >
                        <Check size={13} /> Mark all read
                    </button>
                )}
            </div>

            {notifications.length > 0 ? (
                <div className="space-y-2">
                    {notifications.map((notif: any, i: number) => {
                        const isRead = readIds.has(notif.id);
                        const cfg = typeConfig[notif.type] ?? typeConfig.INFO;
                        const Icon = cfg.icon;

                        return (
                            <TiltCard
                                key={notif.id}
                                delay={i * 0.03}
                                className={`flex items-start gap-4 p-4 cursor-pointer group ${
                                    isRead
                                        ? "opacity-60"
                                        : ""
                                }`}
                                onClick={() => !isRead && handleMarkRead(notif.id)}
                            >
                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${cfg.bg}`}>
                                    <Icon size={16} className={cfg.color} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-semibold ${isRead ? "text-zinc-500" : "text-zinc-900"}`}>
                                            {notif.title}
                                        </p>
                                        {!isRead && (
                                            <span className="w-2 h-2 rounded-full bg-accent-red flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <p className={`text-xs mt-0.5 leading-relaxed ${isRead ? "text-zinc-400" : "text-zinc-600"}`}>
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-[10px] text-zinc-400">
                                            {new Date(notif.createdAt).toLocaleDateString("en-GB", {
                                                day: "numeric", month: "short", year: "numeric",
                                                hour: "2-digit", minute: "2-digit",
                                            })}
                                        </p>
                                        {notif.actionUrl && (
                                            <Link
                                                href={notif.actionUrl}
                                                className="text-[10px] font-bold text-accent-red hover:text-accent-gold transition-colors flex items-center gap-0.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                View <ChevronRight size={10} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </TiltCard>
                        );
                    })}
                </div>
            ) : (
                <TiltCard className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <Bell size={40} className="text-zinc-200 mb-4" />
                        <p className="text-zinc-600 font-semibold">No notifications yet</p>
                        <p className="text-zinc-400 text-sm mt-2">
                            Membership reminders, grading results, and event updates will appear here.
                        </p>
                    </div>
                </TiltCard>
            )}
        </div>
    );
}
