"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, CreditCard, ChevronDown, ChevronUp, Package } from "lucide-react";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

interface Props {
    orders: any[];
}

const statusColors: Record<string, string> = {
    PENDING:  "bg-amber-50 text-amber-600 border-amber-200",
    PAID:     "bg-emerald-50 text-emerald-600 border-emerald-200",
    FAILED:   "bg-red-50 text-red-600 border-red-200",
    REFUNDED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function membershipLine(order: any): { label: string; amount: number } | null {
    if (order.includesMembership) {
        return { label: "Membership Renewal (1 year)", amount: Number(order.membershipFee ?? order.total) };
    }
    if (order.includesDojoRenewal) {
        return { label: "Dojo Federation Renewal", amount: Number(order.membershipFee ?? order.total) };
    }
    if (order.includesCertificates) {
        return { label: order.notes ?? "Certificate Request", amount: Number(order.total) };
    }
    return null;
}

function orderLabel(order: any, hasOrderItems: boolean): string {
    if (!hasOrderItems) {
        if (order.includesMembership) return "Membership Renewal";
        if (order.includesDojoRenewal) return "Dojo Federation Renewal";
        if (order.includesCertificates) return "Certificate Request";
    }
    return `Order #${order.id.slice(0, 8).toUpperCase()}`;
}

function OrderRow({ order }: { order: any }) {
    const [expanded, setExpanded] = useState(false);
    const statusCls = statusColors[order.paymentStatus] ?? statusColors.PENDING;
    const hasOrderItems = order.orderItems && order.orderItems.length > 0;
    const feeLine = membershipLine(order);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-zinc-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Order header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left hover:bg-zinc-50/50 transition-colors"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-zinc-100 rounded-xl flex-shrink-0">
                        <ShoppingBag size={18} className="text-zinc-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-zinc-900">
                            {orderLabel(order, hasOrderItems)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" ,
 timeZone: DEFAULT_TIME_ZONE,
})}
                            {order.paymentMethod && ` · ${order.paymentMethod}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-14 sm:pl-0">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${statusCls}`}>
                        {order.paymentStatus}
                    </span>
                    <div className="flex items-center gap-1 text-zinc-900 font-bold text-sm">
                        <CreditCard size={14} className="text-zinc-400" />
                        ৳{Number(order.total).toLocaleString()}
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                </div>
            </button>

            {/* Order items */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-zinc-100"
                    >
                        <div className="p-5 space-y-2">
                            {feeLine && (
                                <div className="flex items-center justify-between py-2.5 border-b border-zinc-100">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-zinc-100 rounded-lg flex-shrink-0">
                                            <CreditCard size={14} className="text-zinc-500" />
                                        </div>
                                        <p className="text-sm font-medium text-zinc-900 truncate">{feeLine.label}</p>
                                    </div>
                                    <p className="text-sm font-bold text-zinc-900 flex-shrink-0">
                                        ৳{feeLine.amount.toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {hasOrderItems && (
                                <>
                                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-3 mt-1">
                                        Order Items ({order.orderItems.length})
                                    </p>
                                    {order.orderItems.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-zinc-50 last:border-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-1.5 bg-zinc-100 rounded-lg flex-shrink-0">
                                                    <Package size={14} className="text-zinc-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-zinc-900 truncate">
                                                        {item.product?.nameEn ?? "Product"}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        Qty: {item.quantity} × ৳{Number(item.unitPrice).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-zinc-900 flex-shrink-0">
                                                ৳{(item.quantity * Number(item.unitPrice)).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </>
                            )}

                            {!hasOrderItems && !feeLine && (
                                <p className="text-xs text-zinc-500">{order.notes ?? "No item details available."}</p>
                            )}

                            {/* Order total */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                                <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Total</p>
                                <p className="text-base font-bold text-zinc-900">৳{Number(order.total).toLocaleString()}</p>
                            </div>

                            {order.shippingAddress && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1">Shipping To</p>
                                    <p className="text-xs text-zinc-600">{order.shippingAddress}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function OrdersClient({ orders }: Props) {
    const totalSpent = orders
        .filter((o: any) => o.paymentStatus === "PAID")
        .reduce((sum: number, o: any) => sum + Number(o.total), 0);

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Shop Orders</h1>
                <p className="text-zinc-500 mt-1 text-sm">View your purchase history and order status.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm">
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">Total Orders</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">{orders.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm">
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">Total Spent</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">৳{totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm col-span-2 sm:col-span-1">
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">Pending</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                        {orders.filter((o: any) => o.paymentStatus === "PENDING").length}
                    </p>
                </div>
            </div>

            {orders.length > 0 ? (
                <div className="space-y-3">
                    {orders.map((order: any, i: number) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <OrderRow order={order} />
                        </motion.div>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-12 border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center"
                >
                    <ShoppingBag size={40} className="text-zinc-200 mb-4" />
                    <p className="text-zinc-600 font-semibold">No orders yet</p>
                    <p className="text-zinc-400 text-sm mt-2">
                        Shop items like uniforms, equipment, and JKA merchandise will appear here after purchase.
                    </p>
                </motion.div>
            )}
        </div>
    );
}
