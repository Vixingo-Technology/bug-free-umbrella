"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import {
    ShoppingBag, Search, ChevronDown, ChevronUp, CreditCard,
    User as UserIcon, Package, AlertCircle, CheckCircle2,
    Award, IdCard, Truck, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
    updateOrderStatusAction,
    updateOrderFulfillmentAction,
} from "@/app/actions/admin-orders";

type Status = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
type FulfillmentStatus = "PREPARING" | "IN_TRANSIT" | "DELIVERED" | "RETURNED";
type Category = "SHOP" | "CERTIFICATE" | "MEMBERSHIP";

type Order = {
    id: string;
    paymentStatus: Status;
    fulfillmentStatus: FulfillmentStatus;
    paymentMethod: string | null;
    total: number;
    currency: string;
    transactionId: string | null;
    includesMembership: boolean;
    includesCertificates: boolean;
    category: Category;
    notes: string | null;
    createdAt: string | Date;
    member: {
        id: string | null;
        fullName: string;
        email: string;
        phone: string | null;
        address: string | null;
        memberNumber: string | null;
        isGuest: boolean;
    };
    orderItems: {
        id: string;
        quantity: number;
        unitPrice: number;
        product: { id: string; name: string } | null;
    }[];
};

const statusStyles: Record<Status, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    REFUNDED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const fulfillmentStyles: Record<FulfillmentStatus, string> = {
    PREPARING: "bg-sky-50 text-sky-700 border-sky-200",
    IN_TRANSIT: "bg-indigo-50 text-indigo-700 border-indigo-200",
    DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
};

const fulfillmentLabels: Record<FulfillmentStatus, string> = {
    PREPARING: "Preparing",
    IN_TRANSIT: "In transit",
    DELIVERED: "Delivered",
    RETURNED: "Returned",
};

const categoryTabs: { key: Category; label: string; icon: typeof ShoppingBag }[] = [
    { key: "SHOP", label: "Shop", icon: ShoppingBag },
    { key: "CERTIFICATE", label: "Certificate", icon: Award },
    { key: "MEMBERSHIP", label: "Membership", icon: IdCard },
];

function formatTimestamp(v: string | Date) {
    const d = new Date(v);
    return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const PAGE_SIZE = 10;

export default function OrdersAdminClient({ orders }: { orders: Order[] }) {
    const [tab, setTab] = useState<Category>("SHOP");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => { setPage(1); }, [tab, search, statusFilter]);

    const counts = useMemo(() => {
        const c: Record<Category, number> = { SHOP: 0, CERTIFICATE: 0, MEMBERSHIP: 0 };
        orders.forEach((o) => { c[o.category] += 1; });
        return c;
    }, [orders]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (o.category !== tab) return false;
            if (statusFilter !== "ALL" && o.paymentStatus !== statusFilter) return false;
            if (!q) return true;
            return (
                o.id.toLowerCase().includes(q) ||
                o.member.fullName.toLowerCase().includes(q) ||
                o.member.email.toLowerCase().includes(q) ||
                (o.transactionId ?? "").toLowerCase().includes(q)
            );
        });
    }, [orders, search, statusFilter, tab]);

    const totals = useMemo(() => {
        const t = { all: 0, paid: 0, pending: 0 };
        filtered.forEach((o) => {
            t.all += o.total;
            if (o.paymentStatus === "PAID") t.paid += o.total;
            else if (o.paymentStatus === "PENDING") t.pending += o.total;
        });
        return t;
    }, [filtered]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    {filtered.length} {categoryTabs.find((c) => c.key === tab)?.label.toLowerCase()} orders
                </p>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-200">
                {categoryTabs.map(({ key, label, icon: Icon }) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                                active
                                    ? "border-accent-red text-accent-red"
                                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                            }`}
                        >
                            <Icon size={15} />
                            {label}
                            <span className={`ml-1 text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded-full ${
                                active ? "bg-accent-red/10 text-accent-red" : "bg-zinc-100 text-zinc-500"
                            }`}>
                                {counts[key]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Filtered total" value={totals.all} accent="zinc" />
                <StatCard label="Paid" value={totals.paid} accent="emerald" />
                <StatCard label="Pending" value={totals.pending} accent="amber" />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search order id, member, transaction…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "ALL" | Status)}
                        className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[170px]"
                    >
                        <option value="ALL">All statuses</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
            </div>

            {/* Orders */}
            <div className="space-y-3">
                {paged.map((o) => (
                    <OrderRow key={o.id} order={o} onFlash={flash} />
                ))}
                {filtered.length === 0 && (
                    <div className="py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No orders match the current filters.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
                <Pagination
                    page={currentPage}
                    pageCount={pageCount}
                    total={filtered.length}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                />
            )}

            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.kind === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                >
                    {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "zinc" | "emerald" | "amber" }) {
    const map = {
        zinc: "bg-zinc-50 text-zinc-900 border-zinc-200",
        emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
        amber: "bg-amber-50 text-amber-900 border-amber-200",
    };
    return (
        <div className={`p-4 rounded-2xl border ${map[accent]}`}>
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-70">{label}</p>
            <p className="text-2xl font-bold mt-1">৳{value.toLocaleString()}</p>
        </div>
    );
}

function OrderRow({ order, onFlash }: { order: Order; onFlash: (k: "ok" | "err", m: string) => void }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<Status>(order.paymentStatus);
    const [fulfillment, setFulfillment] = useState<FulfillmentStatus>(order.fulfillmentStatus);

    const CategoryIcon =
        order.category === "CERTIFICATE" ? Award :
        order.category === "MEMBERSHIP" ? IdCard :
        ShoppingBag;

    function changeStatus(next: Status) {
        if (next === status) return;
        const fd = new FormData();
        fd.set("id", order.id);
        fd.set("status", next);
        startTransition(async () => {
            const res = await updateOrderStatusAction(fd);
            if (res.ok) {
                setStatus(next);
                onFlash("ok", `Order marked ${next.toLowerCase()}.`);
            } else onFlash("err", res.error);
        });
    }

    function changeFulfillment(next: FulfillmentStatus) {
        if (next === fulfillment) return;
        const fd = new FormData();
        fd.set("id", order.id);
        fd.set("status", next);
        startTransition(async () => {
            const res = await updateOrderFulfillmentAction(fd);
            if (res.ok) {
                setFulfillment(next);
                onFlash("ok", `Fulfillment set to ${fulfillmentLabels[next].toLowerCase()}.`);
            } else onFlash("err", res.error);
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden ${isPending ? "opacity-60" : ""}`}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left hover:bg-zinc-50/60 transition-colors"
            >
                <div className="flex items-start gap-4 min-w-0">
                    <div className="p-2.5 bg-zinc-100 rounded-xl flex-shrink-0">
                        <CategoryIcon size={18} className="text-zinc-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                            {order.includesMembership && (
                                <span className="ml-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Membership
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            <UserIcon size={11} className="inline-block mr-1" />
                            {order.member.fullName} · {order.member.email}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                            {formatTimestamp(order.createdAt)}
                            {order.paymentMethod && ` · ${order.paymentMethod}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-14 sm:pl-0 flex-wrap justify-end">
                    {order.category === "SHOP" && (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <select
                                value={fulfillment}
                                onChange={(e) => changeFulfillment(e.target.value as FulfillmentStatus)}
                                className={`appearance-none pl-6 pr-7 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red/30 ${fulfillmentStyles[fulfillment]}`}
                            >
                                <option value="PREPARING">Preparing</option>
                                <option value="IN_TRANSIT">In transit</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="RETURNED">Returned</option>
                            </select>
                            <Truck size={10} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                    )}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                            value={status}
                            onChange={(e) => changeStatus(e.target.value as Status)}
                            className={`appearance-none pl-2.5 pr-7 py-1 text-[11px] font-bold tracking-widest uppercase border rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red/30 ${statusStyles[status]}`}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="FAILED">Failed</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>
                    <p className="text-base font-bold text-zinc-900 whitespace-nowrap">
                        ৳{order.total.toLocaleString()}
                    </p>
                    {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Items */}
                        <div>
                            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3 flex items-center gap-1.5">
                                <Package size={11} /> Items
                            </p>
                            <div className="space-y-2">
                                {order.orderItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-medium text-zinc-800">
                                                {item.product?.name ?? "Removed product"}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {item.quantity} × ৳{item.unitPrice.toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-zinc-900">
                                            ৳{(item.quantity * item.unitPrice).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                                {order.orderItems.length === 0 && (
                                    <p className="text-xs text-zinc-400 italic">
                                        {order.category === "CERTIFICATE"
                                            ? "Certificate request order — no shop line items."
                                            : order.category === "MEMBERSHIP"
                                                ? "Membership-only order — no shop line items."
                                                : "No line items."}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="space-y-4 text-sm">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3 flex items-center gap-1.5">
                                    <UserIcon size={11} /> Customer
                                    {order.member.isGuest && (
                                        <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                                            Guest
                                        </span>
                                    )}
                                </p>
                                <Meta label="Name" value={order.member.fullName} />
                                <Meta label="Email" value={order.member.email || "—"} />
                                <Meta label="Phone" value={order.member.phone ?? "—"} />
                                <Meta label="Address" value={order.member.address ?? "—"} />
                                {order.member.memberNumber && (
                                    <Meta label="Member #" value={order.member.memberNumber} />
                                )}
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3 flex items-center gap-1.5">
                                    <CreditCard size={11} /> Payment
                                </p>
                                <Meta label="Placed at" value={formatTimestamp(order.createdAt)} />
                                <Meta label="Transaction" value={order.transactionId ?? "—"} mono />
                                <Meta label="Method" value={order.paymentMethod ?? "—"} />
                                <Meta label="Currency" value={order.currency} />
                                {order.notes && <Meta label="Notes" value={order.notes} />}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function Pagination({
    page, pageCount, total, pageSize, onChange,
}: {
    page: number; pageCount: number; total: number; pageSize: number;
    onChange: (p: number) => void;
}) {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    const pages: (number | "…")[] = [];
    const push = (v: number | "…") => { if (pages[pages.length - 1] !== v) pages.push(v); };
    for (let i = 1; i <= pageCount; i++) {
        if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) push(i);
        else push("…");
    }

    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <p className="text-xs text-zinc-500">
                Showing <span className="font-semibold text-zinc-800">{start}</span>–<span className="font-semibold text-zinc-800">{end}</span> of <span className="font-semibold text-zinc-800">{total}</span>
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`e${i}`} className="px-2 text-xs text-zinc-400">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                                p === page
                                    ? "bg-accent-red text-white border-accent-red"
                                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onChange(Math.min(pageCount, page + 1))}
                    disabled={page === pageCount}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-zinc-500 flex-shrink-0">{label}</span>
            <span className={`text-xs text-zinc-800 text-right break-words min-w-0 ${mono ? "font-mono" : "font-medium"}`}>
                {value}
            </span>
        </div>
    );
}
