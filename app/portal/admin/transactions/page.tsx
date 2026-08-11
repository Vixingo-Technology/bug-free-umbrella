import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Ban, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { formatDate, formatTime } from "@/lib/format/datetime";
import type {
    PaymentTransactionKind,
    PaymentTransactionStatus,
    PaymentProvider,
} from "@/prisma/generated/client";

export const metadata = { title: "Transactions — JKA Admin" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<PaymentTransactionKind, string> = {
    MEMBERSHIP: "Membership",
    PAST_BELT_FEE: "Past-belt fee",
    CERTIFICATES: "Certificates",
    DOJO_RENEWAL: "Dojo renewal",
    TRANSFER: "Dojo transfer",
    SERVICE_REQUEST: "Service request",
    EVENT_TICKET: "Event ticket",
    SHOP: "Shop",
    OTHER: "Other",
};

const STATUS_STYLE: Record<
    PaymentTransactionStatus,
    { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
    PENDING:   { label: "Pending",   className: "text-amber-700 bg-amber-50 border-amber-200",     Icon: Clock },
    SUCCESS:   { label: "Success",   className: "text-emerald-700 bg-emerald-50 border-emerald-200", Icon: CheckCircle2 },
    FAILED:    { label: "Failed",    className: "text-red-700 bg-red-50 border-red-200",           Icon: XCircle },
    CANCELLED: { label: "Cancelled", className: "text-zinc-600 bg-zinc-100 border-zinc-200",       Icon: Ban },
};

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
    SSLCOMMERZ: "SSLCommerz",
    DEV_BYPASS: "Dev bypass",
    MANUAL: "Manual",
};

type SearchParams = Promise<{ status?: string; kind?: string }>;

export default async function AdminTransactionsPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    await requireAdmin();
    const params = await searchParams;

    const status = isStatus(params.status) ? params.status : null;
    const kind = isKind(params.kind) ? params.kind : null;

    const [rows, totals] = await Promise.all([
        prisma.paymentTransaction.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(kind ? { kind } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: 200,
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, phone: true, memberNumber: true },
                },
            },
        }),
        prisma.paymentTransaction.groupBy({
            by: ["status"],
            _count: { _all: true },
            _sum: { amount: true },
        }),
    ]);

    const statusCount = (s: PaymentTransactionStatus) =>
        totals.find((t) => t.status === s)?._count._all ?? 0;
    const statusAmount = (s: PaymentTransactionStatus) =>
        Number(totals.find((t) => t.status === s)?._sum.amount ?? 0);

    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-zinc-500">
                    Payments
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">
                    Transactions
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Every gateway attempt — membership, certificates, event tickets, shop orders — captured with timestamps.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryTile
                    label="Successful"
                    count={statusCount("SUCCESS")}
                    amount={statusAmount("SUCCESS")}
                    tint="emerald"
                />
                <SummaryTile
                    label="Pending"
                    count={statusCount("PENDING")}
                    amount={statusAmount("PENDING")}
                    tint="amber"
                />
                <SummaryTile
                    label="Failed"
                    count={statusCount("FAILED")}
                    amount={statusAmount("FAILED")}
                    tint="red"
                />
                <SummaryTile
                    label="Cancelled"
                    count={statusCount("CANCELLED")}
                    amount={statusAmount("CANCELLED")}
                    tint="zinc"
                />
            </div>

            <FilterBar currentStatus={status} currentKind={kind} />

            <section className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden">
                <header className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
                    <Receipt size={14} className="text-accent-red" />
                    <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                        Recent activity
                    </h3>
                    <span className="ml-auto text-[11px] text-zinc-500">
                        Showing {rows.length} of latest 200
                    </span>
                </header>

                {rows.length === 0 ? (
                    <div className="p-12 text-center text-sm text-zinc-500">
                        No transactions match this filter yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                    <th className="px-5 py-3">When</th>
                                    <th className="px-5 py-3">Buyer</th>
                                    <th className="px-5 py-3">Kind</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Provider</th>
                                    <th className="px-5 py-3 text-right">Amount</th>
                                    <th className="px-5 py-3">Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const style = STATUS_STYLE[r.status];
                                    const Icon = style.Icon;
                                    return (
                                        <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                                            <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                                                <p className="font-mono text-zinc-700">{formatDate(r.createdAt)}</p>
                                                <p>{formatTime(r.createdAt)}</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-zinc-900">
                                                    {r.user?.fullName ?? r.buyerName ?? "—"}
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    {r.user?.email ?? r.buyerEmail ?? ""}
                                                </p>
                                                {r.user?.memberNumber && (
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-0.5">
                                                        {r.user.memberNumber}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-zinc-700">
                                                {KIND_LABEL[r.kind]}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.className}`}>
                                                    <Icon size={11} />
                                                    {style.label}
                                                </span>
                                                {r.reason && r.status !== "SUCCESS" && (
                                                    <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                                                        {r.reason}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-zinc-500">
                                                {PROVIDER_LABEL[r.provider]}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-zinc-900 whitespace-nowrap">
                                                {r.currency} {Number(r.amount).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-zinc-500">
                                                {r.gatewayTxnId && (
                                                    <p className="font-mono truncate max-w-[10rem]" title={r.gatewayTxnId}>
                                                        {r.gatewayTxnId}
                                                    </p>
                                                )}
                                                {r.orderId && (
                                                    <p className="font-mono text-[10px] text-zinc-400 truncate max-w-[10rem]" title={r.orderId}>
                                                        order {r.orderId.slice(0, 8)}
                                                    </p>
                                                )}
                                                {r.eventRegistrationId && (
                                                    <p className="font-mono text-[10px] text-zinc-400 truncate max-w-[10rem]" title={r.eventRegistrationId}>
                                                        reg {r.eventRegistrationId.slice(0, 8)}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function SummaryTile({
    label,
    count,
    amount,
    tint,
}: {
    label: string;
    count: number;
    amount: number;
    tint: "emerald" | "amber" | "red" | "zinc";
}) {
    const bg = {
        emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
        amber:   "bg-amber-50 border-amber-200 text-amber-800",
        red:     "bg-red-50 border-red-200 text-red-800",
        zinc:    "bg-zinc-50 border-zinc-200 text-zinc-700",
    }[tint];

    return (
        <div className={`rounded-sm border p-4 ${bg}`}>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">{label}</p>
            <p className="mt-1 text-2xl font-bold">{count.toLocaleString()}</p>
            <p className="text-[11px] mt-0.5 opacity-70">
                ৳{amount.toLocaleString()} total
            </p>
        </div>
    );
}

function FilterBar({
    currentStatus,
    currentKind,
}: {
    currentStatus: PaymentTransactionStatus | null;
    currentKind: PaymentTransactionKind | null;
}) {
    const statuses: (PaymentTransactionStatus | null)[] = [
        null,
        "SUCCESS",
        "PENDING",
        "FAILED",
        "CANCELLED",
    ];
    const kinds: (PaymentTransactionKind | null)[] = [
        null,
        "MEMBERSHIP",
        "PAST_BELT_FEE",
        "CERTIFICATES",
        "DOJO_RENEWAL",
        "EVENT_TICKET",
        "TRANSFER",
        "SHOP",
    ];

    const build = (s: PaymentTransactionStatus | null, k: PaymentTransactionKind | null) => {
        const p = new URLSearchParams();
        if (s) p.set("status", s);
        if (k) p.set("kind", k);
        const q = p.toString();
        return q ? `/portal/admin/transactions?${q}` : `/portal/admin/transactions`;
    };

    return (
        <div className="space-y-2">
            <FilterGroup
                label="Status"
                items={statuses.map((s) => ({
                    key: s ?? "all",
                    label: s ? STATUS_STYLE[s].label : "All",
                    href: build(s, currentKind),
                    active: currentStatus === s || (!currentStatus && s === null),
                }))}
            />
            <FilterGroup
                label="Kind"
                items={kinds.map((k) => ({
                    key: k ?? "all",
                    label: k ? KIND_LABEL[k] : "All",
                    href: build(currentStatus, k),
                    active: currentKind === k || (!currentKind && k === null),
                }))}
            />
        </div>
    );
}

function FilterGroup({
    label,
    items,
}: {
    label: string;
    items: { key: string; label: string; href: string; active: boolean }[];
}) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 w-14">
                {label}
            </span>
            {items.map((i) => (
                <Link
                    key={i.key}
                    href={i.href}
                    className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm border transition-colors ${
                        i.active
                            ? "bg-accent-red text-white border-accent-red"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-accent-red hover:text-accent-red"
                    }`}
                >
                    {i.label}
                </Link>
            ))}
        </div>
    );
}

function isStatus(v: string | undefined): v is PaymentTransactionStatus {
    return v === "PENDING" || v === "SUCCESS" || v === "FAILED" || v === "CANCELLED";
}
function isKind(v: string | undefined): v is PaymentTransactionKind {
    return (
        v === "MEMBERSHIP" ||
        v === "PAST_BELT_FEE" ||
        v === "CERTIFICATES" ||
        v === "DOJO_RENEWAL" ||
        v === "TRANSFER" ||
        v === "EVENT_TICKET" ||
        v === "SHOP" ||
        v === "OTHER"
    );
}
