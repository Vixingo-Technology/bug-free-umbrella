"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Award,
    Search,
    ChevronLeft,
    ChevronRight,
    Settings,
} from "lucide-react";
import { approveCertificateRequestAction } from "@/app/portal/admin/certificates/actions";
import { useRouter } from "next/navigation";

type RecentRequest = {
    id: string;
    status: string;
    price: string | number;
    rankName: string;
    memberName: string;
    certificateUrl: string | null;
    createdAt: string;
    member: { fullName: string; memberNumber: string | null };
    dojo: { name: string };
};

type Props = {
    recentRequests: RecentRequest[];
};

export default function AdminCertificatesClient({ recentRequests }: Props) {
    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                        Admin
                    </p>
                    <h1 className="text-2xl font-bold text-zinc-900 mt-1">
                        Certificate requests
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Review, approve, and download issued certificates.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/portal/admin/certificates/settings"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase bg-zinc-900 text-white px-3 py-1.5 rounded-sm hover:bg-accent-red"
                    >
                        <Settings size={12} /> Certificate settings
                    </Link>
                    <Award size={28} className="text-accent-red" />
                </div>
            </header>

            <RecentRequestsCard requests={recentRequests} />
        </div>
    );
}

const PAGE_SIZE = 15;

function certNumber(id: string) {
    return id.slice(0, 8).toUpperCase();
}

function RecentRequestsCard({ requests }: { requests: RecentRequest[] }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);

    async function handleApprove(id: string) {
        setApprovingId(id);
        setApproveError(null);
        const res = await approveCertificateRequestAction({
            certificateRequestId: id,
        });
        setApprovingId(null);
        if ("error" in res) {
            setApproveError(res.error);
            return;
        }
        router.refresh();
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return requests;
        return requests.filter((r) => {
            const name = r.member.fullName.toLowerCase();
            const num = certNumber(r.id).toLowerCase();
            const memberNo = (r.member.memberNumber ?? "").toLowerCase();
            return (
                name.includes(q) ||
                num.includes(q) ||
                memberNo.includes(q)
            );
        });
    }, [requests, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);

    function updateQuery(next: string) {
        setQuery(next);
        setPage(1);
    }

    if (requests.length === 0) {
        return (
            <section className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-center text-sm text-zinc-500">
                No certificate requests yet.
            </section>
        );
    }

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    Recent certificate requests
                </h3>
                <div className="relative w-full sm:w-72">
                    <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => updateQuery(e.target.value)}
                        placeholder="Search name or certificate no."
                        className="w-full bg-zinc-50 border border-zinc-200 pl-8 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-accent-red"
                    />
                </div>
            </header>
            {approveError && (
                <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
                    {approveError}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Certificate no.</th>
                            <th className="px-5 py-3">Member</th>
                            <th className="px-5 py-3">Dojo</th>
                            <th className="px-5 py-3">Rank</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Price</th>
                            <th className="px-5 py-3 text-right">PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-sm text-zinc-500"
                                >
                                    No matching requests.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b border-zinc-100"
                                >
                                    <td className="px-5 py-3 font-mono text-[11px] tracking-wider text-zinc-700">
                                        {certNumber(r.id)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-zinc-900">
                                            {r.member.fullName}
                                        </p>
                                        {r.member.memberNumber && (
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                                                {r.member.memberNumber}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {r.dojo.name}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {r.rankName}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusPill status={r.status} />
                                    </td>
                                    <td className="px-5 py-3 text-right text-zinc-700 font-mono">
                                        ৳{Number(r.price).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            {r.status === "PAID" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleApprove(r.id)
                                                    }
                                                    disabled={
                                                        approvingId === r.id
                                                    }
                                                    className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                                                >
                                                    {approvingId === r.id
                                                        ? "Approving…"
                                                        : "Approve"}
                                                </button>
                                            )}
                                            <a
                                                href={`/certificates/${r.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-zinc-600 hover:text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                            >
                                                Preview
                                            </a>
                                            {r.certificateUrl && (
                                                <a
                                                    href={r.certificateUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                                >
                                                    PDF
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <footer className="px-5 py-3 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                <p>
                    {filtered.length === 0
                        ? "0 results"
                        : `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                </p>
                <div className="inline-flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <span className="font-mono text-zinc-700">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage >= totalPages}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                        Next <ChevronRight size={12} />
                    </button>
                </div>
            </footer>
        </section>
    );
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
        PAID: "bg-blue-50 text-blue-700 border-blue-200",
        GENERATING: "bg-violet-50 text-violet-700 border-violet-200",
        ISSUED: "bg-emerald-50 text-emerald-700 border-emerald-200",
        FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span
            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}
