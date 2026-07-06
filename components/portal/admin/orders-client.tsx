"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import {
    ShoppingBag, Search, ChevronDown, ChevronUp, CreditCard,
    User as UserIcon, Package, AlertCircle, CheckCircle2,
} from "lucide-react";
import { updateOrderStatusAction } from "@/app/actions/admin-orders";

type Status = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

type Order = {
    id: string;
    paymentStatus: Status;
    paymentMethod: string | null;
    total: number;
    currency: string;
    transactionId: string | null;
    includesMembership: boolean;
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

export default function OrdersAdminClient({ orders }: { orders: Order[] }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (statusFilter !== "ALL" && o.paymentStatus !== statusFilter) return false;
            if (!q) return true;
            return (
                o.id.toLowerCase().includes(q) ||
                o.member.fullName.toLowerCase().includes(q) ||
                o.member.email.toLowerCase().includes(q) ||
                (o.transactionId ?? "").toLowerCase().includes(q)
            );
        });
    }, [orders, search, statusFilter]);

    const totals = useMemo(() => {
        const t = { all: 0, paid: 0, pending: 0 };
        filtered.forEach((o) => {
            t.all += o.total;
            if (o.paymentStatus === "PAID") t.paid += o.total;
            else if (o.paymentStatus === "PENDING") t.pending += o.total;
        });
        return t;
    }, [filtered]);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    {filtered.length} of {orders.length} orders
                </p>
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
                {filtered.map((o) => (
                    <OrderRow key={o.id} order={o} onFlash={flash} />
                ))}
                {filtered.length === 0 && (
                    <div className="py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No orders match the current filters.
                    </div>
                )}
            </div>

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
                        <ShoppingBag size={18} className="text-zinc-600" />
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
                            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            {order.paymentMethod && ` · ${order.paymentMethod}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-14 sm:pl-0">
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
                                    <p className="text-xs text-zinc-400 italic">No line items (membership-only order).</p>
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
