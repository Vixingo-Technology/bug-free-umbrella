"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Search,
} from "lucide-react";
import { formatBeltRank } from "@/lib/constants";

type RequestRow = {
    id: string;
    status: string;
    price: string | number;
    rankName: string;
    memberName: string;
    certificateUrl: string | null;
    failureReason: string | null;
    createdAt: string;
    member: { id: string; fullName: string; memberNumber: string | null };
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const PAGE_SIZE = 10;

export default function RequestHistoryList({
    requests,
}: {
    requests: RequestRow[];
}) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return requests;
        return requests.filter((r) => {
            const haystack = [
                r.member.fullName,
                r.member.memberNumber ?? "",
                r.rankName,
                r.status,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [requests, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (requests.length === 0) {
        return (
            <div className="p-8 text-center text-sm text-zinc-500">
                No certificate orders yet.
            </div>
        );
    }

    return (
        <div>
            <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 flex items-center gap-3">
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by name, rank, member #…"
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                    No orders match &ldquo;{query}&rdquo;.
                </div>
            ) : (
                <>
                    <ul className="sm:hidden divide-y divide-zinc-100">
                        {pageItems.map((r) => (
                            <li key={r.id} className="px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <Link
                                            href={`/portal/dojo/members/${r.member.id}`}
                                            className="font-semibold text-zinc-900 hover:text-accent-red block truncate"
                                        >
                                            {r.member.fullName}
                                        </Link>
                                        <p className="text-[11px] text-zinc-400 uppercase tracking-widest truncate">
                                            {r.member.memberNumber ?? "—"}
                                        </p>
                                        <p className="text-xs text-zinc-600 mt-1 truncate">
                                            {formatBeltRank(r.rankName)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <StatusPill
                                            status={r.status}
                                            reason={r.failureReason}
                                        />
                                        <span className="font-mono text-sm text-zinc-700">
                                            ৳{Number(r.price).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-zinc-500">
                                        {fmtDate.format(new Date(r.createdAt))}
                                    </span>
                                    <div className="inline-flex items-center gap-3">
                                        <Link
                                            href={`/certificates/${r.id}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 text-zinc-600 hover:text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                        >
                                            <Eye size={11} /> Preview
                                        </Link>
                                        {r.certificateUrl ? (
                                            <a
                                                href={r.certificateUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                            >
                                                <Download size={11} /> PDF
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Rank</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Price</th>
                                    <th className="px-5 py-3 text-right">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((r) => (
                                    <tr key={r.id} className="border-b border-zinc-100">
                                        <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">
                                            {fmtDate.format(new Date(r.createdAt))}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/portal/dojo/members/${r.member.id}`}
                                                className="font-semibold text-zinc-900 hover:text-accent-red"
                                            >
                                                {r.member.fullName}
                                            </Link>
                                            <p className="text-[11px] text-zinc-400 uppercase tracking-widest">
                                                {r.member.memberNumber ?? "—"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 text-zinc-600">{formatBeltRank(r.rankName)}</td>
                                        <td className="px-5 py-3">
                                            <StatusPill status={r.status} reason={r.failureReason} />
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono text-zinc-700 whitespace-nowrap">
                                            ৳{Number(r.price).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <Link
                                                    href={`/certificates/${r.id}`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 text-zinc-600 hover:text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                                >
                                                    <Eye size={11} /> Preview
                                                </Link>
                                                {r.certificateUrl ? (
                                                    <a
                                                        href={r.certificateUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                                    >
                                                        <Download size={11} /> PDF
                                                    </a>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-4 sm:px-5 py-3 border-t border-zinc-200 flex items-center justify-between gap-3 text-xs text-zinc-500">
                            <span>
                                {start + 1}–
                                {Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
                                {filtered.length}
                            </span>
                            <div className="inline-flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200 uppercase tracking-widest text-[10px] font-bold"
                                >
                                    <ChevronLeft size={12} />
                                    <span className="hidden sm:inline">Prev</span>
                                </button>
                                <span className="px-2 font-mono">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200 uppercase tracking-widest text-[10px] font-bold"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StatusPill({
    status,
    reason,
}: {
    status: string;
    reason: string | null;
}) {
    const map: Record<string, string> = {
        PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
        PAID: "bg-blue-50 text-blue-700 border-blue-200",
        GENERATING: "bg-violet-50 text-violet-700 border-violet-200",
        ISSUED: "bg-emerald-50 text-emerald-700 border-emerald-200",
        FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span
            title={reason ?? undefined}
            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${
                map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"
            }`}
        >
            {status.replace("_", " ")}
        </span>
    );
}
