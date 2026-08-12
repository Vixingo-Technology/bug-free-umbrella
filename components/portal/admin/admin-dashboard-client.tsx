"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
    Users, UserPlus, ShieldOff, Building2, Package, ShoppingBag,
    DollarSign, TrendingUp, ArrowRight, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { displayEmail } from "@/lib/format/email";

type Stats = {
    totalMembers: number;
    students: number;
    instructors: number;
    admins: number;
    pendingMembers: number;
    suspendedMembers: number;
    newMembers30d: number;
    totalDojos: number;
    activeDojos: number;
    totalProducts: number;
    activeProducts: number;
    pendingOrders: number;
    paidOrders: number;
    totalRevenue: number;
};

type RecentMember = {
    id: string;
    fullName: string;
    email: string;
    contactEmail: string | null;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    membershipStatus: "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
    createdAt: string | Date;
    dojo: { name: string } | null;
};

type RecentOrder = {
    id: string;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    total: number;
    createdAt: string | Date;
    member: { fullName: string; email: string; contactEmail: string | null } | null;
};

const statusStyles: Record<RecentMember["membershipStatus"], string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    EXPIRED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

const orderStatusStyles: Record<RecentOrder["paymentStatus"], string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    REFUNDED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const roleColors: Record<RecentMember["role"], string> = {
    ADMIN: "from-amber-500 to-amber-600",
    INSTRUCTOR: "from-blue-500 to-indigo-600",
    STUDENT: "from-emerald-500 to-green-600",
};

export default function AdminDashboardClient({
    adminName, stats, recentMembers, recentOrders,
}: {
    adminName: string;
    stats: Stats;
    recentMembers: RecentMember[];
    recentOrders: RecentOrder[];
}) {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6 sm:p-8 shadow-xl"
            >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Welcome back</p>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-1">{adminName}</h1>
                        <p className="text-sm text-zinc-300 mt-2">
                            JKA Bangladesh control center · {stats.totalMembers} members · {stats.activeDojos} active dojos
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <QuickAction href="/portal/admin/members" label="Invite member" />
                        <QuickAction href="/portal/admin/products" label="Add product" variant="ghost" />
                    </div>
                </div>
            </motion.div>

            {/* Top stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total members"
                    value={stats.totalMembers.toString()}
                    delta={stats.newMembers30d > 0 ? `+${stats.newMembers30d} this month` : "No new this month"}
                    icon={Users}
                    accent="indigo"
                />
                <StatCard
                    label="Revenue (paid)"
                    value={`৳${stats.totalRevenue.toLocaleString()}`}
                    delta={`${stats.paidOrders} paid orders`}
                    icon={DollarSign}
                    accent="emerald"
                />
                <StatCard
                    label="Pending orders"
                    value={stats.pendingOrders.toString()}
                    delta="Awaiting payment"
                    icon={ShoppingBag}
                    accent="amber"
                />
                <StatCard
                    label="Active dojos"
                    value={`${stats.activeDojos}`}
                    delta={`${stats.totalDojos} total`}
                    icon={Building2}
                    accent="zinc"
                />
            </div>

            {/* Member breakdown + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BreakdownCard
                    title="Member roles"
                    items={[
                        { label: "Students", value: stats.students, color: "bg-emerald-500" },
                        { label: "Instructors", value: stats.instructors, color: "bg-blue-500" },
                        { label: "Admins", value: stats.admins, color: "bg-amber-500" },
                    ]}
                    total={stats.totalMembers}
                />

                <AlertCard
                    title="Needs attention"
                    items={[
                        {
                            icon: Clock,
                            label: "Pending memberships",
                            value: stats.pendingMembers,
                            tone: "amber",
                            href: "/portal/admin/members",
                        },
                        {
                            icon: ShieldOff,
                            label: "Suspended accounts",
                            value: stats.suspendedMembers,
                            tone: "red",
                            href: "/portal/admin/members",
                        },
                        {
                            icon: ShoppingBag,
                            label: "Unpaid orders",
                            value: stats.pendingOrders,
                            tone: "amber",
                            href: "/portal/admin/orders",
                        },
                    ]}
                />

                <CatalogCard
                    activeProducts={stats.activeProducts}
                    totalProducts={stats.totalProducts}
                />
            </div>

            {/* Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel
                    title="Recent members"
                    icon={UserPlus}
                    href="/portal/admin/members"
                >
                    {recentMembers.length === 0 ? (
                        <EmptyRow label="No members yet." />
                    ) : (
                        <ul className="divide-y divide-zinc-100">
                            {recentMembers.map((m) => (
                                <li key={m.id} className="py-3 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleColors[m.role]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                        {m.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-zinc-900 truncate">{m.fullName}</p>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {displayEmail(m) || m.email}
                                            {m.dojo && <span className="text-zinc-400"> · {m.dojo.name}</span>}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${statusStyles[m.membershipStatus]}`}>
                                        {m.membershipStatus}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel
                    title="Recent orders"
                    icon={ShoppingBag}
                    href="/portal/admin/orders"
                >
                    {recentOrders.length === 0 ? (
                        <EmptyRow label="No orders yet." />
                    ) : (
                        <ul className="divide-y divide-zinc-100">
                            {recentOrders.map((o) => (
                                <li key={o.id} className="py-3 flex items-center gap-3">
                                    <div className="p-2 bg-zinc-100 rounded-xl flex-shrink-0">
                                        <ShoppingBag size={14} className="text-zinc-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-zinc-900 truncate">
                                            #{o.id.slice(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {o.member?.fullName ?? "Guest"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <p className="text-sm font-bold text-zinc-900">
                                            ৳{Number(o.total).toLocaleString()}
                                        </p>
                                        <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full border ${orderStatusStyles[o.paymentStatus]}`}>
                                            {o.paymentStatus}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </div>
    );
}

function QuickAction({
    href, label, variant,
}: {
    href: string;
    label: string;
    variant?: "ghost";
}) {
    const cls =
        variant === "ghost"
            ? "bg-white/10 hover:bg-white/20 text-white"
            : "bg-accent-red hover:bg-accent-red/90 text-white";
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${cls}`}
        >
            {label}
            <ArrowRight size={12} />
        </Link>
    );
}

function StatCard({
    label, value, delta, icon: Icon, accent,
}: {
    label: string;
    value: string;
    delta: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: "indigo" | "emerald" | "amber" | "zinc";
}) {
    const accents = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        zinc: "bg-zinc-100 text-zinc-700",
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">{label}</p>
                <div className={`p-2 rounded-xl ${accents[accent]}`}>
                    <Icon size={14} />
                </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <TrendingUp size={11} className="opacity-60" />
                {delta}
            </p>
        </motion.div>
    );
}

function BreakdownCard({
    title, items, total,
}: {
    title: string;
    items: { label: string; value: number; color: string }[];
    total: number;
}) {
    return (
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-4">{title}</p>
            <div className="space-y-3">
                {items.map((item) => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                        <div key={item.label}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="font-medium text-zinc-700">{item.label}</span>
                                <span className="text-zinc-500">
                                    {item.value} <span className="text-zinc-400">({pct}%)</span>
                                </span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${item.color} rounded-full transition-all`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AlertCard({
    title, items,
}: {
    title: string;
    items: {
        icon: React.ComponentType<{ size?: number; className?: string }>;
        label: string;
        value: number;
        tone: "amber" | "red";
        href: string;
    }[];
}) {
    return (
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-4 flex items-center gap-1.5">
                <AlertCircle size={11} /> {title}
            </p>
            <ul className="space-y-2">
                {items.map((item) => {
                    const tones = {
                        amber: "bg-amber-50 text-amber-700",
                        red: "bg-red-50 text-red-700",
                    };
                    return (
                        <li key={item.label}>
                            <Link
                                href={item.href}
                                className="flex items-center gap-3 p-2.5 -mx-1 rounded-xl hover:bg-zinc-50 transition-colors group"
                            >
                                <div className={`p-1.5 rounded-lg ${tones[item.tone]}`}>
                                    <item.icon size={12} />
                                </div>
                                <span className="text-sm text-zinc-700 flex-1">{item.label}</span>
                                <span className="text-sm font-bold text-zinc-900">{item.value}</span>
                                <ArrowRight size={12} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function CatalogCard({
    activeProducts, totalProducts,
}: {
    activeProducts: number;
    totalProducts: number;
}) {
    return (
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-4 flex items-center gap-1.5">
                <Package size={11} /> Shop catalog
            </p>

            <div className="flex items-baseline gap-2 mb-1">
                <p className="text-2xl font-bold text-zinc-900">{activeProducts}</p>
                <p className="text-xs text-zinc-500">/ {totalProducts} listed</p>
            </div>
            <p className="text-xs text-zinc-500">products visible to members</p>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100">
                <Link
                    href="/portal/admin/products"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-3 py-2 rounded-lg transition-colors border border-zinc-200"
                >
                    Manage products
                </Link>
                <Link
                    href="/portal/admin/dojos"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-3 py-2 rounded-lg transition-colors border border-zinc-200"
                >
                    Manage dojos
                </Link>
            </div>
        </div>
    );
}

function Panel({
    title, icon: Icon, href, children,
}: {
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
                <p className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Icon size={14} className="text-zinc-500" />
                    {title}
                </p>
                <Link
                    href={href}
                    className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors flex items-center gap-1"
                >
                    View all <ArrowRight size={10} />
                </Link>
            </div>
            <div className="px-5 py-2">{children}</div>
        </div>
    );
}

function EmptyRow({ label }: { label: string }) {
    return (
        <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 size={12} /> {label}
        </div>
    );
}
