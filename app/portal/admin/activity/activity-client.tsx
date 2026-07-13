"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Activity,
    Info,
    CheckCircle2,
    AlertTriangle,
    AlertOctagon,
    ShieldAlert,
    Radio,
    Search,
    X,
    User as UserIcon,
    Globe,
    Clock,
    ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playNotificationChime } from "@/lib/notification-sound";

type Severity = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "CRITICAL";

export type ActivityRow = {
    id: string;
    action: string;
    message: string;
    severity: Severity;
    actor_id: string | null;
    actor_label: string | null;
    actor_role: string | null;
    resource: string | null;
    resource_id: string | null;
    ip: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
};

const sevConfig: Record<Severity, { icon: typeof Info; color: string; ring: string; badge: string; dot: string }> = {
    INFO:     { icon: Info,          color: "text-zinc-500",    ring: "ring-zinc-200",   badge: "bg-zinc-100 text-zinc-700",     dot: "bg-zinc-400" },
    SUCCESS:  { icon: CheckCircle2,  color: "text-emerald-600", ring: "ring-emerald-200", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    WARNING:  { icon: AlertTriangle, color: "text-amber-600",   ring: "ring-amber-200",   badge: "bg-amber-50 text-amber-700",    dot: "bg-amber-500" },
    ERROR:    { icon: AlertOctagon,  color: "text-red-600",     ring: "ring-red-200",     badge: "bg-red-50 text-red-700",        dot: "bg-red-500" },
    CRITICAL: { icon: ShieldAlert,   color: "text-red-700",     ring: "ring-red-300",     badge: "bg-red-100 text-red-800",       dot: "bg-red-600 animate-pulse" },
};

const SEVERITIES: Severity[] = ["INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"];
const MAX_ROWS = 500;
const ANOMALY_WINDOW_MS = 60_000;
const ANOMALY_THRESHOLD = 5;

function relTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ActivityClient({ initial }: { initial: ActivityRow[] }) {
    const [rows, setRows] = useState<ActivityRow[]>(initial);
    const [connected, setConnected] = useState(false);
    const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set(SEVERITIES));
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<ActivityRow | null>(null);
    const [burstAlert, setBurstAlert] = useState<string | null>(null);
    const anomalyTimestamps = useRef<number[]>([]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("activity-page")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "activity_logs" },
                (payload) => {
                    const row = payload.new as Partial<ActivityRow>;
                    const normalized: ActivityRow = {
                        id: row.id!,
                        action: row.action!,
                        message: row.message!,
                        severity: row.severity as Severity,
                        actor_id: row.actor_id ?? null,
                        actor_label: row.actor_label ?? null,
                        actor_role: row.actor_role ?? null,
                        resource: row.resource ?? null,
                        resource_id: row.resource_id ?? null,
                        ip: row.ip ?? null,
                        user_agent: row.user_agent ?? null,
                        metadata: (row.metadata ?? {}) as Record<string, unknown>,
                        created_at: row.created_at!,
                    };
                    setRows((prev) => [normalized, ...prev].slice(0, MAX_ROWS));

                    if (normalized.severity === "CRITICAL" || normalized.severity === "ERROR") {
                        playNotificationChime();
                    }

                    const now = Date.now();
                    anomalyTimestamps.current = [
                        ...anomalyTimestamps.current.filter((t) => now - t < ANOMALY_WINDOW_MS),
                        now,
                    ];
                    if (
                        (normalized.severity === "WARNING" || normalized.severity === "ERROR" || normalized.severity === "CRITICAL") &&
                        anomalyTimestamps.current.length >= ANOMALY_THRESHOLD
                    ) {
                        setBurstAlert(
                            `${anomalyTimestamps.current.length} anomalies in the last minute — investigate now.`,
                        );
                        setTimeout(() => setBurstAlert(null), 10_000);
                    }
                },
            )
            .subscribe((status) => setConnected(status === "SUBSCRIBED"));

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Force re-render every 30s so relative times stay fresh.
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (!severityFilter.has(r.severity)) return false;
            if (!q) return true;
            return (
                r.action.toLowerCase().includes(q) ||
                r.message.toLowerCase().includes(q) ||
                (r.actor_label ?? "").toLowerCase().includes(q) ||
                (r.resource ?? "").toLowerCase().includes(q)
            );
        });
    }, [rows, severityFilter, query]);

    const stats = useMemo(() => {
        const now = Date.now();
        const fiveMin = now - 5 * 60_000;
        const recent = rows.filter((r) => new Date(r.created_at).getTime() > fiveMin);
        const anomalies = recent.filter((r) => r.severity === "WARNING" || r.severity === "ERROR" || r.severity === "CRITICAL");
        return {
            total: rows.length,
            recent: recent.length,
            anomalies: anomalies.length,
            criticals: rows.filter((r) => r.severity === "CRITICAL").length,
        };
    }, [rows]);

    function toggleSeverity(sev: Severity) {
        setSeverityFilter((prev) => {
            const next = new Set(prev);
            if (next.has(sev)) next.delete(sev);
            else next.add(sev);
            return next;
        });
    }

    return (
        <div className="space-y-4">
            {burstAlert && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3"
                >
                    <ShieldAlert size={18} className="text-red-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-red-800">{burstAlert}</span>
                </motion.div>
            )}

            {/* Stat row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile label="Live" value={connected ? "Online" : "Offline"} color={connected ? "emerald" : "zinc"} icon={<Radio size={14} />} />
                <StatTile label="Last 5 min" value={String(stats.recent)} color="blue" icon={<Clock size={14} />} />
                <StatTile label="Anomalies (5 min)" value={String(stats.anomalies)} color={stats.anomalies > 0 ? "amber" : "zinc"} icon={<AlertTriangle size={14} />} />
                <StatTile label="Total critical" value={String(stats.criticals)} color={stats.criticals > 0 ? "red" : "zinc"} icon={<ShieldAlert size={14} />} />
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search action, message, actor…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:bg-zinc-100"
                            aria-label="Clear"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {SEVERITIES.map((sev) => {
                        const cfg = sevConfig[sev];
                        const active = severityFilter.has(sev);
                        return (
                            <button
                                key={sev}
                                onClick={() => toggleSeverity(sev)}
                                className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full transition-all ${
                                    active ? cfg.badge : "bg-zinc-100/60 text-zinc-400 line-through"
                                }`}
                            >
                                {sev}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feed */}
            <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                    <Activity size={12} />
                    <span>Event stream</span>
                    <span className="ml-auto text-zinc-500 normal-case tracking-normal font-normal">
                        {filtered.length} of {rows.length} events
                    </span>
                </div>
                <div className="divide-y divide-zinc-100 max-h-[65vh] overflow-y-auto">
                    {filtered.length === 0 && (
                        <div className="px-4 py-16 text-center text-sm text-zinc-400">
                            No matching events.
                        </div>
                    )}
                    <AnimatePresence initial={false}>
                        {filtered.map((row) => {
                            const cfg = sevConfig[row.severity] ?? sevConfig.INFO;
                            const Icon = cfg.icon;
                            return (
                                <motion.button
                                    layout
                                    key={row.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelected(row)}
                                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors text-left"
                                >
                                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Icon size={13} className={`${cfg.color} flex-shrink-0`} />
                                            <span className="text-sm font-semibold text-zinc-900">{row.action}</span>
                                            <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                                                {row.severity}
                                            </span>
                                            {row.resource && (
                                                <span className="text-[10px] text-zinc-400 font-mono">
                                                    {row.resource}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-600 mt-0.5 break-words">
                                            {row.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                                            {row.actor_label && (
                                                <span className="flex items-center gap-1">
                                                    <UserIcon size={10} />
                                                    {row.actor_label}
                                                    {row.actor_role ? ` · ${row.actor_role}` : ""}
                                                </span>
                                            )}
                                            {row.ip && (
                                                <span className="flex items-center gap-1">
                                                    <Globe size={10} />
                                                    {row.ip}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 ml-auto">
                                                <Clock size={10} />
                                                {fmtTime(row.created_at)} · {relTime(row.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Detail drawer */}
            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelected(null)}
                            className="fixed inset-0 bg-black/40 z-40"
                        />
                        <motion.aside
                            initial={{ x: 400 }}
                            animate={{ x: 0 }}
                            exit={{ x: 400 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white z-50 shadow-2xl overflow-y-auto"
                        >
                            <div className="p-5 border-b border-zinc-100 flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                        Event
                                    </p>
                                    <h2 className="font-mono text-base font-semibold text-zinc-900 break-words">
                                        {selected.action}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <DetailRow label="Severity">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${sevConfig[selected.severity].badge}`}>
                                        {selected.severity}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Message">
                                    <p className="text-sm text-zinc-800 leading-relaxed break-words">
                                        {selected.message}
                                    </p>
                                </DetailRow>
                                <DetailRow label="Time">
                                    <p className="text-sm text-zinc-800">
                                        {new Date(selected.created_at).toLocaleString("en-GB")}
                                    </p>
                                    <p className="text-[11px] text-zinc-400">{relTime(selected.created_at)}</p>
                                </DetailRow>
                                {(selected.actor_label || selected.actor_role) && (
                                    <DetailRow label="Actor">
                                        <p className="text-sm text-zinc-800">{selected.actor_label ?? "—"}</p>
                                        {selected.actor_role && (
                                            <p className="text-[11px] text-zinc-400">{selected.actor_role}</p>
                                        )}
                                    </DetailRow>
                                )}
                                {selected.resource && (
                                    <DetailRow label="Resource">
                                        <p className="text-sm font-mono text-zinc-800 break-all">
                                            {selected.resource}
                                            {selected.resource_id ? `:${selected.resource_id}` : ""}
                                        </p>
                                    </DetailRow>
                                )}
                                {selected.ip && (
                                    <DetailRow label="IP">
                                        <p className="text-sm font-mono text-zinc-800">{selected.ip}</p>
                                    </DetailRow>
                                )}
                                {selected.user_agent && (
                                    <DetailRow label="User agent">
                                        <p className="text-xs text-zinc-600 break-words">{selected.user_agent}</p>
                                    </DetailRow>
                                )}
                                {Object.keys(selected.metadata ?? {}).length > 0 && (
                                    <DetailRow label="Metadata">
                                        <pre className="text-[11px] font-mono bg-zinc-50 border border-zinc-100 rounded-lg p-3 overflow-x-auto text-zinc-700">
                                            {JSON.stringify(selected.metadata, null, 2)}
                                        </pre>
                                    </DetailRow>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatTile({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: string;
    color: "zinc" | "emerald" | "blue" | "amber" | "red";
    icon: React.ReactNode;
}) {
    const map: Record<typeof color, string> = {
        zinc: "text-zinc-600 bg-zinc-100",
        emerald: "text-emerald-700 bg-emerald-50",
        blue: "text-blue-700 bg-blue-50",
        amber: "text-amber-700 bg-amber-50",
        red: "text-red-700 bg-red-50",
    };
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${map[color]}`}>
                    {icon}
                </span>
                {label}
            </div>
            <p className="mt-2 text-xl font-serif font-bold text-zinc-900">{value}</p>
        </div>
    );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                {label}
            </p>
            {children}
        </div>
    );
}
