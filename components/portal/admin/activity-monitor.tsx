"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Activity,
    ChevronUp,
    ChevronDown,
    Info,
    CheckCircle2,
    AlertTriangle,
    AlertOctagon,
    ShieldAlert,
    Radio,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playNotificationChime } from "@/lib/notification-sound";

type Severity = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "CRITICAL";

type LogRow = {
    id: string;
    action: string;
    message: string;
    severity: Severity;
    actor_label: string | null;
    actor_role: string | null;
    resource: string | null;
    created_at: string;
};

const sevConfig: Record<Severity, { icon: typeof Info; color: string; dot: string }> = {
    INFO:     { icon: Info,          color: "text-zinc-400",   dot: "bg-zinc-400" },
    SUCCESS:  { icon: CheckCircle2,  color: "text-emerald-500", dot: "bg-emerald-500" },
    WARNING:  { icon: AlertTriangle, color: "text-amber-500",  dot: "bg-amber-500" },
    ERROR:    { icon: AlertOctagon,  color: "text-red-500",    dot: "bg-red-500" },
    CRITICAL: { icon: ShieldAlert,   color: "text-red-600",    dot: "bg-red-600 animate-pulse" },
};

function relTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.max(1, Math.floor(diff))}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const MAX_ROWS = 40;
const ANOMALY_WINDOW_MS = 60_000;
const ANOMALY_THRESHOLD = 5;

export default function ActivityMonitor() {
    const [expanded, setExpanded] = useState(false);
    const [rows, setRows] = useState<LogRow[]>([]);
    const [connected, setConnected] = useState(false);
    const [criticalCount, setCriticalCount] = useState(0);
    const anomalyTimestamps = useRef<number[]>([]);
    const [burstAlert, setBurstAlert] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        async function seed() {
            const { data } = await supabase
                .from("activity_logs")
                .select("id, action, message, severity, actor_label, actor_role, resource, created_at")
                .order("created_at", { ascending: false })
                .limit(MAX_ROWS);
            if (!cancelled && data) {
                setRows(data as LogRow[]);
            }
        }
        seed();

        const channel = supabase
            .channel("activity-monitor")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "activity_logs" },
                (payload) => {
                    const row = payload.new as LogRow;
                    setRows((prev) => [row, ...prev].slice(0, MAX_ROWS));

                    const sev = row.severity;
                    if (sev === "CRITICAL" || sev === "ERROR") {
                        setCriticalCount((c) => c + 1);
                        playNotificationChime();
                    }

                    const now = Date.now();
                    anomalyTimestamps.current = [
                        ...anomalyTimestamps.current.filter((t) => now - t < ANOMALY_WINDOW_MS),
                        now,
                    ];
                    if (
                        (sev === "WARNING" || sev === "ERROR" || sev === "CRITICAL") &&
                        anomalyTimestamps.current.length >= ANOMALY_THRESHOLD
                    ) {
                        setBurstAlert(
                            `${anomalyTimestamps.current.length} anomalies in the last minute`,
                        );
                        setTimeout(() => setBurstAlert(null), 8000);
                    }
                },
            )
            .subscribe((status) => {
                setConnected(status === "SUBSCRIBED");
            });

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, []);

    // Force re-render every 30s so relative times stay fresh.
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const latest = rows[0];

    return (
        <div className="border-t border-zinc-100 bg-white">
            {burstAlert && (
                <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                    <ShieldAlert size={13} className="text-red-600 flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-red-700 truncate">
                        {burstAlert}
                    </span>
                </div>
            )}

            <button
                type="button"
                onClick={() => {
                    setExpanded((v) => !v);
                    if (!expanded) setCriticalCount(0);
                }}
                className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-zinc-50 transition-colors"
            >
                <div className="relative flex-shrink-0">
                    <Activity size={15} className="text-zinc-700" />
                    <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${
                            connected ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                        title={connected ? "Live" : "Reconnecting"}
                    />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                        Activity Monitor
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                        {latest
                            ? `${latest.action} · ${relTime(latest.created_at)} ago`
                            : connected
                                ? "Waiting for events…"
                                : "Connecting…"}
                    </p>
                </div>
                {criticalCount > 0 && !expanded && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                        {criticalCount > 9 ? "9+" : criticalCount}
                    </span>
                )}
                {expanded ? (
                    <ChevronDown size={14} className="text-zinc-400" />
                ) : (
                    <ChevronUp size={14} className="text-zinc-400" />
                )}
            </button>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-2 pb-2 max-h-72 overflow-y-auto space-y-1">
                            <div className="px-2 py-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Radio size={9} className={connected ? "text-emerald-500" : "text-zinc-400"} />
                                    {connected ? "Live" : "Offline"}
                                </span>
                                <span>{rows.length} events</span>
                            </div>
                            {rows.length === 0 && (
                                <div className="px-2 py-4 text-center text-[11px] text-zinc-400">
                                    No activity yet.
                                </div>
                            )}
                            {rows.map((row) => {
                                const cfg = sevConfig[row.severity] ?? sevConfig.INFO;
                                const Icon = cfg.icon;
                                return (
                                    <div
                                        key={row.id}
                                        className="px-2 py-1.5 rounded-lg hover:bg-zinc-50 flex items-start gap-2"
                                    >
                                        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <Icon size={11} className={`${cfg.color} flex-shrink-0`} />
                                                <span className="text-[11px] font-semibold text-zinc-900 truncate">
                                                    {row.action}
                                                </span>
                                                <span className="text-[9px] text-zinc-400 flex-shrink-0 ml-auto">
                                                    {relTime(row.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-zinc-600 leading-snug break-words">
                                                {row.message}
                                            </p>
                                            {(row.actor_label || row.actor_role) && (
                                                <p className="text-[10px] text-zinc-400 truncate">
                                                    {row.actor_label ?? "system"}
                                                    {row.actor_role ? ` · ${row.actor_role}` : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
