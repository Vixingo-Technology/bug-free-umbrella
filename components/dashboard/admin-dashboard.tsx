"use client";

import { motion } from "motion/react";
import {
    Users,
    MapPin,
    ShoppingBag,
    TrendingUp,
    GraduationCap,
    Crown,
    Building2,
    Swords,
} from "lucide-react";

interface AdminDashboardProps {
    member: any;
    totalMembers: number;
    totalDojos: number;
    totalOrders: number;
    recentMembers: any[];
    allDojos: any[];
}

function StatCard({
    icon,
    label,
    value,
    gradient,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    gradient: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={`${gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold">
                        {label}
                    </p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                </div>
                <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">{icon}</div>
            </div>
        </motion.div>
    );
}

export default function AdminDashboard({
    member,
    totalMembers,
    totalDojos,
    totalOrders,
    recentMembers,
    allDojos,
}: AdminDashboardProps) {
    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                    <Crown size={22} className="text-amber-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">
                        Admin Control Panel
                    </h1>
                    <p className="text-zinc-500 mt-0.5">
                        System overview and management for JKA Bangladesh.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users size={22} />}
                    label="Total Members"
                    value={totalMembers.toLocaleString()}
                    gradient="bg-gradient-to-br from-emerald-500 to-green-600"
                    delay={0}
                />
                <StatCard
                    icon={<Building2 size={22} />}
                    label="Active Dojos"
                    value={totalDojos.toLocaleString()}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    delay={0.05}
                />
                <StatCard
                    icon={<ShoppingBag size={22} />}
                    label="Total Orders"
                    value={totalOrders.toLocaleString()}
                    gradient="bg-gradient-to-br from-purple-500 to-violet-600"
                    delay={0.1}
                />
                <StatCard
                    icon={<TrendingUp size={22} />}
                    label="Your Role"
                    value="Admin"
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    delay={0.15}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dojo Management */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <Building2 size={18} className="text-blue-500" />
                        Dojo Management
                    </h2>
                    {allDojos.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {allDojos.map((d: any, i: number) => (
                                <div
                                    key={d.id ?? i}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <MapPin size={14} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900">{d.name}</p>
                                            <p className="text-xs text-zinc-500">{d.city}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-zinc-900">{d._count?.members ?? 0}</p>
                                        <p className="text-[10px] tracking-widest uppercase text-zinc-400">Members</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Building2 size={36} className="text-zinc-200 mb-3" />
                            <p className="text-zinc-500 text-sm">No dojos created yet.</p>
                        </div>
                    )}
                </motion.div>

                {/* Recent Members */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-emerald-500" />
                        Recent Members
                    </h2>
                    {recentMembers.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {recentMembers.map((m: any, i: number) => (
                                <div
                                    key={m.id ?? i}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                            <GraduationCap size={14} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900">{m.fullName}</p>
                                            <p className="text-xs text-zinc-500">{m.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${m.role === "ADMIN"
                                                ? "bg-amber-50 text-amber-600"
                                                : m.role === "INSTRUCTOR"
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-emerald-50 text-emerald-600"
                                                }`}
                                        >
                                            {m.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Users size={36} className="text-zinc-200 mb-3" />
                            <p className="text-zinc-500 text-sm">No members registered yet.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* System-wide Overview Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8 text-white shadow-xl"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-red/5 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-gold/5 rounded-full blur-[60px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Swords size={20} className="text-accent-gold" />
                        <h2 className="text-lg font-bold">System Summary</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-500">Members</p>
                            <p className="text-2xl font-bold mt-1">{totalMembers}</p>
                        </div>
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-500">Dojos</p>
                            <p className="text-2xl font-bold mt-1">{totalDojos}</p>
                        </div>
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-500">Orders</p>
                            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
                        </div>
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-500">Admin</p>
                            <p className="text-2xl font-bold mt-1">{member?.fullName?.split(" ")[0] ?? "—"}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
