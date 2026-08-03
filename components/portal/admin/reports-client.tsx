"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
    BarChart3,
    Download,
    Search,
    CalendarRange,
    Building2,
    User as UserIcon,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
} from "lucide-react";
import { REPORT_DEFINITIONS, type ReportKey, type ReportDefinition } from "@/lib/reports/report-types";

type Dojo = { id: string; name: string; shortName: string | null };
type Member = {
    id: string;
    fullName: string;
    email: string;
    memberNumber: string | null;
    roleId: string;
};

type Scope = "ALL" | "DOJO" | "MEMBER";

interface Props {
    dojos: Dojo[];
    members: Member[];
}

const GROUP_ORDER = [
    "Members",
    "Dojos",
    "Ranking",
    "Events",
    "Shop",
    "Tournaments",
    "Achievements",
    "Payments",
    "Services",
    "System",
] as const;

export default function ReportsAdminClient({ dojos, members }: Props) {
    const [selected, setSelected] = useState<ReportKey>("members");
    const [scope, setScope] = useState<Scope>("ALL");
    const [dojoId, setDojoId] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [memberSearch, setMemberSearch] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const definition = useMemo(
        () => REPORT_DEFINITIONS.find((r) => r.key === selected)!,
        [selected],
    );

    const groups = useMemo(() => {
        const g = new Map<string, ReportDefinition[]>();
        for (const r of REPORT_DEFINITIONS) {
            const list = g.get(r.group) ?? [];
            list.push(r);
            g.set(r.group, list);
        }
        return g;
    }, []);

    const availableScopes = useMemo(() => {
        const s: Scope[] = ["ALL"];
        if (definition.supportsDojoScope) s.push("DOJO");
        if (definition.supportsMemberScope) s.push("MEMBER");
        return s;
    }, [definition]);

    // Reset scope if the current one isn't available on this report.
    useEffect(() => {
        if (!availableScopes.includes(scope)) setScope("ALL");
    }, [availableScopes, scope]);

    const filteredMembers = useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return members.slice(0, 50);
        return members
            .filter(
                (m) =>
                    m.fullName.toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q) ||
                    (m.memberNumber ?? "").toLowerCase().includes(q),
            )
            .slice(0, 50);
    }, [members, memberSearch]);

    async function handleDownload() {
        setToast(null);

        if (scope === "DOJO" && !dojoId) {
            setToast({ kind: "err", msg: "Please pick a dojo." });
            return;
        }
        if (scope === "MEMBER" && !userId) {
            setToast({ kind: "err", msg: "Please pick a member." });
            return;
        }

        const params = new URLSearchParams();
        params.set("report", selected);
        if (definition.supportsDateRange) {
            if (from) params.set("from", from);
            if (to) params.set("to", to);
        }
        if (scope === "DOJO" && dojoId) params.set("dojoId", dojoId);
        if (scope === "MEMBER" && userId) params.set("userId", userId);

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/reports?${params.toString()}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to generate report");
            }
            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="([^"]+)"/);
            const filename = match?.[1] ?? `${selected}.csv`;

            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setToast({ kind: "ok", msg: `Downloaded ${filename}` });
        } catch (e) {
            setToast({
                kind: "err",
                msg: e instanceof Error ? e.message : "Failed to download",
            });
        } finally {
            setLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    }

    const selectedMember = members.find((m) => m.id === userId);
    const selectedDojo = dojos.find((d) => d.id === dojoId);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
                        <BarChart3 className="h-6 w-6 text-red-600" />
                        Reports
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        Export any dataset as a spreadsheet. Filter by date range, dojo, or a single member.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                {/* Left — report picker */}
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                    <h2 className="mb-4 text-sm font-medium text-zinc-900">
                        Choose a report
                    </h2>

                    <div className="grid gap-6">
                        {GROUP_ORDER.filter((g) => groups.has(g)).map((group) => (
                            <div key={group}>
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    {group}
                                </h3>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {groups.get(group)!.map((r) => {
                                        const active = r.key === selected;
                                        return (
                                            <button
                                                key={r.key}
                                                onClick={() => setSelected(r.key)}
                                                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                                                    active
                                                        ? "border-red-600 bg-red-50 ring-2 ring-red-100"
                                                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                                                }`}
                                            >
                                                <FileSpreadsheet
                                                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                                                        active ? "text-red-600" : "text-zinc-400"
                                                    }`}
                                                />
                                                <span
                                                    className={`text-sm ${
                                                        active
                                                            ? "font-medium text-zinc-900"
                                                            : "text-zinc-700"
                                                    }`}
                                                >
                                                    {r.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* Right — filters + download */}
                <motion.aside
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="sticky top-6 h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                    <h2 className="mb-4 text-sm font-medium text-zinc-900">Filters</h2>

                    {/* Selected report chip */}
                    <div className="mb-5 rounded-lg bg-zinc-50 p-3">
                        <div className="text-xs uppercase tracking-wider text-zinc-500">
                            Report
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900">
                            {definition.label}
                        </div>
                    </div>

                    {/* Date range */}
                    {definition.supportsDateRange && (
                        <div className="mb-5">
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                <CalendarRange className="h-3.5 w-3.5" />
                                Date range
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-xs text-zinc-600">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-zinc-600">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs text-zinc-500">
                                Leave blank for all-time.
                            </p>
                        </div>
                    )}

                    {/* Scope */}
                    <div className="mb-5">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Scope
                        </label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
                            {availableScopes.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setScope(s)}
                                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                                        scope === s
                                            ? "bg-white text-zinc-900 shadow"
                                            : "text-zinc-600 hover:text-zinc-900"
                                    }`}
                                >
                                    {s === "ALL" ? "All" : s === "DOJO" ? "By Dojo" : "By Member"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dojo picker */}
                    {scope === "DOJO" && (
                        <div className="mb-5">
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                <Building2 className="h-3.5 w-3.5" />
                                Dojo
                            </label>
                            <div className="relative">
                                <select
                                    value={dojoId}
                                    onChange={(e) => setDojoId(e.target.value)}
                                    className="w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 py-2 pr-8 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                >
                                    <option value="">— Select a dojo —</option>
                                    {dojos.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                            {d.shortName ? ` (${d.shortName})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            </div>
                            {selectedDojo && (
                                <p className="mt-1.5 text-xs text-zinc-500">
                                    Filtering to {selectedDojo.name}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Member picker */}
                    {scope === "MEMBER" && (
                        <div className="mb-5">
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                <UserIcon className="h-3.5 w-3.5" />
                                Member
                            </label>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    placeholder="Search by name, email, or member #"
                                    className="w-full rounded-md border border-zinc-300 bg-white pl-8 pr-2 py-1.5 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                            <div className="max-h-56 overflow-y-auto rounded-md border border-zinc-200">
                                {filteredMembers.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-zinc-500">
                                        No members match your search.
                                    </div>
                                ) : (
                                    filteredMembers.map((m) => {
                                        const active = m.id === userId;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setUserId(m.id)}
                                                className={`flex w-full flex-col items-start gap-0.5 border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 transition ${
                                                    active
                                                        ? "bg-red-50 text-red-900"
                                                        : "hover:bg-zinc-50"
                                                }`}
                                            >
                                                <span className="text-sm font-medium text-zinc-900">
                                                    {m.fullName}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {m.memberNumber ?? m.roleId} · {m.email}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            {selectedMember && (
                                <p className="mt-1.5 text-xs text-zinc-500">
                                    Selected: {selectedMember.fullName}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Download CSV
                            </>
                        )}
                    </button>

                    {toast && (
                        <div
                            className={`mt-3 flex items-start gap-2 rounded-md p-2.5 text-xs ${
                                toast.kind === "ok"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            {toast.kind === "ok" ? (
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{toast.msg}</span>
                        </div>
                    )}
                </motion.aside>
            </div>
        </div>
    );
}
