"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
    Award,
    MapPin,
    Calendar,
    Bell,
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    ChevronRight,
    FileText,
    CalendarDays,
} from "lucide-react";

interface Props {
    member: any;
    membershipStatus: "Active" | "Expired" | "Expiring Soon" | "Pending";
    unreadNotifications: number;
    upcomingEvents: any[];
    userId: string;
}

const statusConfig = {
    Active: { color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" },
    Expired: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, dot: "bg-red-500" },
    "Expiring Soon": { color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" },
    Pending: { color: "text-zinc-600 bg-zinc-50 border-zinc-200", icon: Clock, dot: "bg-zinc-400" },
};

const beltColors: Record<string, string> = {
    "White Belt": "#FFFFFF",
    "Yellow Belt": "#FFD700",
    "Orange Belt": "#FF8C00",
    "Green Belt": "#228B22",
    "Blue Belt": "#0000CD",
    "Brown Belt": "#8B4513",
    "Black Belt": "#1a1a1a",
};

function StatCard({ icon: Icon, label, value, sub, href, delay, accentClass }: {
    icon: any; label: string; value: string; sub?: string; href?: string; delay: number; accentClass?: string;
}) {
    const inner = (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
        >
            <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${accentClass ?? "bg-zinc-50"}`}>
                    <Icon size={18} className="text-zinc-600" />
                </div>
                {href && <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-500 transition-colors mt-1" />}
            </div>
            <div className="mt-3">
                <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">{label}</p>
                <p className="text-xl font-bold text-zinc-900 mt-1 leading-tight">{value}</p>
                {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );

    return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function PortalDashboardClient({ member, membershipStatus, unreadNotifications, upcomingEvents, userId }: Props) {
    const gradings = member?.gradings ?? [];
    const dojo = member?.dojo;
    const statusCfg = statusConfig[membershipStatus];
    const StatusIcon = statusCfg.icon;

    const beltColor = beltColors[member?.currentRank ?? "White Belt"] ?? "#FFFFFF";
    const isDarkBelt = ["Green Belt", "Blue Belt", "Brown Belt", "Black Belt"].includes(member?.currentRank ?? "");

    const expiryDate = member?.expiryDate
        ? new Date(member.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : null;

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Page header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    Welcome back, <span className="text-accent-red">{member?.fullName?.split(" ")[0] ?? "Karateka"}</span>
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">Here&apos;s your membership overview.</p>
            </div>

            {/* Expiry warning banner */}
            {(membershipStatus === "Expired" || membershipStatus === "Expiring Soon") && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${statusCfg.color}`}
                >
                    <StatusIcon size={18} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                            {membershipStatus === "Expired" ? "Your membership has expired." : "Your membership is expiring soon."}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                            {expiryDate ? `Expiry date: ${expiryDate}` : "Please renew to keep access."}
                        </p>
                    </div>
                    <Link
                        href="/portal/profile"
                        className="text-xs font-bold tracking-widest uppercase shrink-0 underline underline-offset-2"
                    >
                        Renew
                    </Link>
                </motion.div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    icon={Award}
                    label="Current Rank"
                    value={member?.currentRank ?? "White Belt"}
                    href="/portal/progress"
                    delay={0}
                    accentClass="bg-amber-50"
                />
                <StatCard
                    icon={MapPin}
                    label="Dojo"
                    value={dojo?.name ?? "Not Assigned"}
                    sub={dojo?.city}
                    delay={0.05}
                    accentClass="bg-blue-50"
                />
                <StatCard
                    icon={Bell}
                    label="Notifications"
                    value={unreadNotifications > 0 ? `${unreadNotifications} new` : "All read"}
                    href="/portal/notifications"
                    delay={0.1}
                    accentClass={unreadNotifications > 0 ? "bg-red-50" : "bg-zinc-50"}
                />
                <StatCard
                    icon={Calendar}
                    label="Membership"
                    value={membershipStatus}
                    sub={expiryDate ? `Expires ${expiryDate}` : undefined}
                    delay={0.15}
                    accentClass={statusCfg.dot === "bg-emerald-500" ? "bg-emerald-50" : "bg-amber-50"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Member Card — col 2 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/10 rounded-full blur-[50px]" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-gold/10 rounded-full blur-[40px]" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-400 font-bold">JKA Bangladesh</p>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500 mt-0.5">Digital Membership</p>
                            </div>
                            <div
                                className="w-8 h-8 rounded-full border-2 border-white/30 flex-shrink-0"
                                style={{ backgroundColor: beltColor }}
                            />
                        </div>

                        <h3 className="text-lg font-bold leading-tight">{member?.fullName ?? "Member"}</h3>
                        <p className="text-zinc-400 text-xs mt-0.5 truncate">{member?.email ?? ""}</p>

                        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-zinc-700/50">
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Rank</p>
                                <p className="text-xs font-semibold mt-0.5">{member?.currentRank ?? "White Belt"}</p>
                            </div>
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Dojo</p>
                                <p className="text-xs font-semibold mt-0.5 truncate">{dojo?.name ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Status</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                    <p className="text-xs font-semibold">{membershipStatus}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-500">Role</p>
                                <p className="text-xs font-semibold mt-0.5">{member?.role ?? "Student"}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Recent Gradings — col 3 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="lg:col-span-3 bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            <Award size={16} className="text-amber-500" />
                            Recent Gradings
                        </h2>
                        <Link href="/portal/grading" className="text-xs text-accent-red font-semibold hover:text-accent-gold transition-colors flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </Link>
                    </div>

                    {gradings.length > 0 ? (
                        <div className="space-y-2">
                            {gradings.map((g: any, i: number) => (
                                <div key={g.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        {g.result === "PASSED" ? (
                                            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                        ) : g.result === "FAILED" ? (
                                            <XCircle size={16} className="text-red-500 flex-shrink-0" />
                                        ) : (
                                            <Clock size={16} className="text-amber-500 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 truncate">
                                                {g.fromRank?.nameEn ?? "—"} → {g.toRank?.nameEn ?? "—"}
                                            </p>
                                            {g.gradedAt && (
                                                <p className="text-xs text-zinc-500">
                                                    {new Date(g.gradedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full flex-shrink-0 ${
                                        g.result === "PASSED" ? "bg-emerald-50 text-emerald-600" :
                                        g.result === "FAILED" ? "bg-red-50 text-red-600" :
                                        "bg-amber-50 text-amber-600"
                                    }`}>
                                        {g.result ?? "PENDING"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Award size={30} className="text-zinc-200 mb-2" />
                            <p className="text-zinc-500 text-sm">No gradings yet.</p>
                            <Link href="/portal/grading" className="text-xs text-accent-red font-semibold mt-2 hover:text-accent-gold transition-colors">
                                Apply for grading →
                            </Link>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Upcoming Events */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <CalendarDays size={16} className="text-indigo-500" />
                        Upcoming Events
                    </h2>
                    <Link href="/portal/events" className="text-xs text-accent-red font-semibold hover:text-accent-gold transition-colors flex items-center gap-1">
                        View All <ChevronRight size={12} />
                    </Link>
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {upcomingEvents.map((ev: any) => (
                            <div key={ev.id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-accent-red/20 transition-colors">
                                <span className="text-[9px] font-bold tracking-widest uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    {ev.eventType.replace("_", " ")}
                                </span>
                                <p className="text-sm font-semibold text-zinc-900 mt-2 leading-snug">{ev.titleEn}</p>
                                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                    <Calendar size={11} />
                                    {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                                {ev.location && (
                                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                        <MapPin size={11} />
                                        {ev.location}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CalendarDays size={30} className="text-zinc-200 mb-2" />
                        <p className="text-zinc-500 text-sm">No upcoming events.</p>
                    </div>
                )}
            </motion.div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { href: "/portal/progress", icon: TrendingUp, label: "My Progress", color: "bg-emerald-50 text-emerald-600" },
                    { href: "/portal/certificates", icon: FileText, label: "Certificates", color: "bg-amber-50 text-amber-600" },
                    { href: "/portal/grading", icon: Award, label: "Apply for Grading", color: "bg-purple-50 text-purple-600" },
                    { href: "/portal/events", icon: CalendarDays, label: "Events", color: "bg-indigo-50 text-indigo-600" },
                ].map(({ href, icon: Icon, label, color }, i) => (
                    <motion.div
                        key={href}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                    >
                        <Link
                            href={href}
                            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all text-center group"
                        >
                            <div className={`p-2.5 rounded-xl ${color}`}>
                                <Icon size={18} />
                            </div>
                            <p className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors leading-tight">{label}</p>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
