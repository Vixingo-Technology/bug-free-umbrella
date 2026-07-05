import Link from "next/link";
import { Download, Eye } from "lucide-react";

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

export default function RequestHistoryList({
    requests,
}: {
    requests: RequestRow[];
}) {
    if (requests.length === 0) {
        return (
            <div className="p-8 text-center text-sm text-zinc-500">
                No certificate orders yet.
            </div>
        );
    }
    return (
        <div className="overflow-x-auto">
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
                    {requests.map((r) => (
                        <tr key={r.id} className="border-b border-zinc-100">
                            <td className="px-5 py-3 text-zinc-500 text-xs">
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
                            <td className="px-5 py-3 text-zinc-600">{r.rankName}</td>
                            <td className="px-5 py-3">
                                <StatusPill status={r.status} reason={r.failureReason} />
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-zinc-700">
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
