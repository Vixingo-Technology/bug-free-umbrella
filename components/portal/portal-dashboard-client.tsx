"use client";

import { useState } from "react";
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
import TiltCard from "./tilt-card";
import DigitalCard from "./digital-card";
import MembershipCardDialog from "./membership-card-dialog";

type UpcomingItem =
    | { kind: "event";   id: string; title: string;      date: string; location: string | null }
    | { kind: "grading"; id: string; targetRank: string; date: string; location: string | null; eventName: string };

interface Props {
    member: any;
    membershipStatus: "Active" | "Expired" | "Expiring Soon" | "Pending";
    unreadNotifications: number;
    upcomingItems: UpcomingItem[];
    userId: string;
}

const statusConfig = {
    Active:          { color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" },
    Expired:         { color: "text-red-600 bg-red-50 border-red-200",             icon: XCircle,      dot: "bg-red-500" },
    "Expiring Soon": { color: "text-amber-600 bg-amber-50 border-amber-200",       icon: AlertTriangle,dot: "bg-amber-500" },
    Pending:         { color: "text-zinc-600 bg-zinc-50 border-zinc-200",          icon: Clock,        dot: "bg-zinc-400" },
};

function StatCard({ icon: Icon, label, value, sub, href, delay, accentClass }: {
    icon: any; label: string; value: string; sub?: string; href?: string; delay: number; accentClass?: string;
}) {
    return (
        <TiltCard href={href} delay={delay} className="p-5">
            <div className="flex flex-col h-full">
                <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${accentClass ?? "bg-zinc-50"}`}>
                        <Icon size={18} className="text-zinc-700" />
                    </div>
                    {href && <ChevronRight size={14} className="text-zinc-300 mt-1" />}
                </div>
                <div className="mt-auto pt-4">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">{label}</p>
                    <p className="text-lg sm:text-xl font-bold text-zinc-900 mt-1 leading-tight">{value}</p>
                    {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
                </div>
            </div>
        </TiltCard>
    );
}

export default function PortalDashboardClient({ member, membershipStatus, unreadNotifications, upcomingItems }: Props) {
    const gradings = member?.gradings ?? [];
    const dojo = member?.dojo;
    const statusCfg = statusConfig[membershipStatus];
    const StatusIcon = statusCfg.icon;

    const [cardOpen, setCardOpen] = useState(false);

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

            {/* Pending membership activation banner */}
            {member?.membershipStatus === "PENDING" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-amber-300 bg-amber-50"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">Your membership is pending activation.</p>
                        <p className="text-xs text-amber-700 mt-0.5 opacity-80">
                            Complete your payment to unlock full member benefits.
                        </p>
                    </div>
                    <Link
                        href="/portal/checkout"
                        className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg transition-colors"
                    >
                        Activate Now →
                    </Link>
                </motion.div>
            )}

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
                        href="/portal/renew"
                        className="text-xs font-bold tracking-widest uppercase shrink-0 underline underline-offset-2"
                    >
                        Renew
                    </Link>
                </motion.div>
            )}

            {/* Stat cards — equal height via grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
                <StatCard icon={Award}    label="Current Rank"  value={member?.currentRank ?? "White Belt"} href="/portal/progress"      delay={0}    accentClass="bg-amber-50" />
                <StatCard icon={MapPin}   label="Dojo"          value={dojo?.name ?? "Not Assigned"}        sub={dojo?.city}              delay={0.05} accentClass="bg-blue-50" />
                <StatCard icon={Bell}     label="Notifications" value={unreadNotifications > 0 ? `${unreadNotifications} new` : "All read"} href="/portal/notifications" delay={0.1}  accentClass={unreadNotifications > 0 ? "bg-red-50" : "bg-zinc-50"} />
                <StatCard icon={Calendar} label="Membership"    value={membershipStatus}                    sub={expiryDate ? `Expires ${expiryDate}` : undefined} delay={0.15} accentClass={statusCfg.dot === "bg-emerald-500" ? "bg-emerald-50" : "bg-amber-50"} />
            </div>

            {/* Member card + Recent gradings */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 auto-rows-fr">
                {/* Member Card — dark glass with belt accent. Click to open share dialog. */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                        className="h-full"
                    >
                        <button
                            type="button"
                            onClick={() => setCardOpen(true)}
                            aria-label="Open digital membership card"
                            className="block w-full h-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/60"
                        >
                            <DigitalCard
                                interactive
                                fullName={member?.fullName ?? "Member"}
                                email={member?.email}
                                currentRank={member?.currentRank}
                                dojoName={dojo?.name}
                                role={member?.role}
                                membershipStatus={membershipStatus}
                                memberNumber={member?.memberNumber}
                                avatarUrl={member?.avatarUrl}
                            />
                        </button>
                    </motion.div>
                </div>

                {/* Recent Gradings */}
                <div className="lg:col-span-3">
                    <TiltCard delay={0.25} className="p-6">
                        <div className="flex flex-col h-full">
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
                                        <div key={g.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 backdrop-blur-sm hover:bg-zinc-100/80 transition-colors">
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
                                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                                    <Award size={30} className="text-zinc-200 mb-2" />
                                    <p className="text-zinc-500 text-sm">No gradings yet.</p>
                                    <Link href="/portal/grading" className="text-xs text-accent-red font-semibold mt-2 hover:text-accent-gold transition-colors">
                                        Apply for grading →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </TiltCard>
                </div>
            </div>

            {/* Upcoming */}
            <TiltCard delay={0.3} className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <CalendarDays size={16} className="text-indigo-500" />
                        Upcoming
                    </h2>
                    <Link href="/portal/events" className="text-xs text-accent-red font-semibold hover:text-accent-gold transition-colors flex items-center gap-1">
                        View All <ChevronRight size={12} />
                    </Link>
                </div>

                {upcomingItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-fr">
                        {upcomingItems.map((it) => {
                            const tagColor = it.kind === "grading"
                                ? "text-accent-red bg-accent-red/10"
                                : "text-indigo-500 bg-indigo-50";
                            const tagLabel = it.kind === "grading" ? "Belt test" : "Event";
                            const title = it.kind === "grading" ? `${it.targetRank} test` : it.title;
                            const subline = it.kind === "grading" ? it.eventName : null;
                            const href = it.kind === "grading" ? "/portal/grading" : "/portal/events";
                            return (
                                <Link
                                    key={`${it.kind}-${it.id}`}
                                    href={href}
                                    className="p-4 rounded-xl bg-zinc-50/70 backdrop-blur-sm border border-zinc-100 hover:border-accent-red/20 transition-colors flex flex-col"
                                >
                                    <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full self-start ${tagColor}`}>
                                        {tagLabel}
                                    </span>
                                    <p className="text-sm font-semibold text-zinc-900 mt-2 leading-snug">{title}</p>
                                    {subline && <p className="text-xs text-zinc-500 mt-0.5">{subline}</p>}
                                    <div className="mt-auto pt-2">
                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Calendar size={11} />
                                            {new Date(it.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                        {it.location && (
                                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                <MapPin size={11} />
                                                {it.location}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CalendarDays size={30} className="text-zinc-200 mb-2" />
                        <p className="text-zinc-500 text-sm">Nothing on the calendar.</p>
                    </div>
                )}
            </TiltCard>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 auto-rows-fr">
                {[
                    { href: "/portal/progress",     icon: TrendingUp,  label: "My Progress",       color: "bg-emerald-50 text-emerald-600" },
                    { href: "/portal/certificates", icon: FileText,    label: "Certificates",      color: "bg-amber-50 text-amber-600" },
                    { href: "/portal/grading",      icon: Award,       label: "Apply for Grading", color: "bg-purple-50 text-purple-600" },
                    { href: "/portal/events",       icon: CalendarDays,label: "Events",            color: "bg-indigo-50 text-indigo-600" },
                ].map(({ href, icon: Icon, label, color }, i) => (
                    <TiltCard key={href} href={href} delay={0.35 + i * 0.05} className="p-4">
                        <div className="flex flex-col items-center justify-center gap-2 h-full text-center">
                            <div className={`p-2.5 rounded-xl ${color}`}>
                                <Icon size={18} />
                            </div>
                            <p className="text-xs font-semibold text-zinc-700 leading-tight">{label}</p>
                        </div>
                    </TiltCard>
                ))}
            </div>

            <MembershipCardDialog
                open={cardOpen}
                onClose={() => setCardOpen(false)}
                memberId={member?.id ?? ""}
                fullName={member?.fullName ?? "Member"}
                email={member?.email}
                currentRank={member?.currentRank}
                dojoName={dojo?.name}
                role={member?.role}
                membershipStatus={membershipStatus}
                memberNumber={member?.memberNumber}
                avatarUrl={member?.avatarUrl}
            />
        </div>
    );
}
