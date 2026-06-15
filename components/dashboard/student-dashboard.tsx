"use client";

import { useState } from "react";
import { motion } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import DigitalCard from "@/components/portal/digital-card";
import MembershipCardDialog from "@/components/portal/membership-card-dialog";
import WeeklySchedule from "@/components/dashboard/weekly-schedule";
import {
  GraduationCap,
  MapPin,
  Calendar,
  Award,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  CalendarDays,
} from "lucide-react";

interface StudentDashboardProps {
    member: any;
}

type MembershipStatusLabel = "Active" | "Expired" | "Expiring Soon" | "Pending";

function StatCard({
    icon,
    label,
    value,
    color,
    delay,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    delay: number;
    href?: string;
}) {
    return (
        <TiltCard delay={delay} className="p-6" href={href}>
            <div className="flex items-center gap-4">
                <div className={`${color} p-3 rounded-xl`}>{icon}</div>
                <div className="min-w-0">
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-zinc-900 mt-0.5 truncate">{value}</p>
                </div>
            </div>
        </TiltCard>
    );
}

function formatBdt(value: any): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `৳${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function deriveMembershipStatus(expiryDate: any): MembershipStatusLabel {
    if (!expiryDate) return "Active";
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= 30) return "Expiring Soon";
    return "Active";
}

export default function StudentDashboard({ member }: StudentDashboardProps) {
    const gradings = member?.gradings ?? [];
    const orders = member?.orders ?? [];
    const dojo = member?.dojo;
    const [cardOpen, setCardOpen] = useState(false);

    const membershipStatus = deriveMembershipStatus(member?.expiryDate);

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                    Welcome back, <span className="text-accent-red">{member?.fullName?.split(" ")[0] ?? "Student"}</span>
                </h1>
                <p className="text-zinc-500 mt-1">
                    Here&apos;s your training overview and membership details.
                </p>
            </div>

            {/* Stats Grid — each tile opens its portal page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<GraduationCap size={20} className="text-emerald-600" />}
                    label="Current Rank"
                    value={member?.currentRank ?? "White Belt"}
                    color="bg-emerald-50"
                    delay={0}
                    href="/portal/progress"
                />
                <StatCard
                    icon={<MapPin size={20} className="text-blue-600" />}
                    label="Dojo"
                    value={dojo?.name ?? "Not Assigned"}
                    color="bg-blue-50"
                    delay={0.05}
                    href="/portal/dashboard"
                />
                <StatCard
                    icon={<Award size={20} className="text-amber-600" />}
                    label="Gradings"
                    value={`${gradings.length} Completed`}
                    color="bg-amber-50"
                    delay={0.1}
                    href="/portal/grading"
                />
                <StatCard
                    icon={<Calendar size={20} className="text-purple-600" />}
                    label="Membership"
                    value={
                        member?.expiryDate
                            ? new Date(member.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                            : "Active"
                    }
                    color="bg-purple-50"
                    delay={0.15}
                    href="/portal/renew"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Digital Membership Card — click to open share dialog */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
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

                {/* Dojo Info */}
                <TiltCard delay={0.25} className="p-8">
                    <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-accent-red" />
                        Your Dojo
                    </h2>
                    {dojo ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Name</p>
                                <p className="text-zinc-900 font-semibold mt-0.5">{dojo.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">City</p>
                                <p className="text-zinc-700 mt-0.5">{dojo.city ?? "—"}</p>
                            </div>
                            {dojo.address && (
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Address</p>
                                    <p className="text-zinc-700 mt-0.5 text-sm">{dojo.address}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <MapPin size={32} className="text-zinc-300 mb-3" />
                            <p className="text-zinc-500 text-sm">No dojo assigned yet.</p>
                            <p className="text-zinc-400 text-xs mt-1">Contact your instructor to be assigned to a dojo.</p>
                        </div>
                    )}
                </TiltCard>
            </div>

            {/* Weekly Schedule — intentionally no hover effect */}
            <TiltCard delay={0.28} className="p-8" tilt={false} glow={false}>
                <h2 className="text-lg font-bold text-zinc-900 mb-1 flex items-center gap-2">
                    <CalendarDays size={18} className="text-accent-red" />
                    Weekly Schedule
                </h2>
                <p className="text-xs text-zinc-500 mb-5">
                    {dojo?.name ? `Training times at ${dojo.name}` : "Training times will appear once a dojo is assigned."}
                </p>
                <WeeklySchedule schedule={dojo?.schedule} />
            </TiltCard>

            {/* Grading History */}
            <TiltCard delay={0.3} className="p-8" href="/portal/grading">
                <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                    <Award size={18} className="text-accent-gold" />
                    Grading History
                </h2>
                {gradings.length > 0 ? (
                    <div className="space-y-3">
                        {gradings.map((g: any, i: number) => (
                            <div
                                key={g.id ?? i}
                                className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {g.result === "PASSED" ? (
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                    ) : g.result === "FAILED" ? (
                                        <XCircle size={18} className="text-red-500" />
                                    ) : (
                                        <Clock size={18} className="text-amber-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900">
                                            {g.fromRank?.nameEn ?? "—"} → {g.toRank?.nameEn ?? "—"}
                                        </p>
                                        <p className="text-xs text-zinc-500">{g.result ?? "Pending"}</p>
                                    </div>
                                </div>
                                {g.certificateUrl && (
                                    <a
                                        href={g.certificateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-accent-red hover:text-accent-gold font-semibold transition-colors"
                                    >
                                        View Certificate
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Award size={36} className="text-zinc-200 mb-3" />
                        <p className="text-zinc-500 text-sm">No grading records yet.</p>
                        <p className="text-zinc-400 text-xs mt-1">Your grading results will appear here after your first exam.</p>
                    </div>
                )}
            </TiltCard>

            {/* Shop Orders */}
            <TiltCard delay={0.35} className="p-8">
                <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-indigo-500" />
                    Recent Orders
                </h2>
                {orders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold border-b border-zinc-100">
                                    <th className="text-left py-3 px-2">Order</th>
                                    <th className="text-left py-3 px-2">Amount</th>
                                    <th className="text-left py-3 px-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o: any, i: number) => (
                                    <tr key={o.id ?? i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                                        <td className="py-3 px-2 font-medium text-zinc-900">
                                            #{(o.id as string).slice(0, 8)}
                                        </td>
                                        <td className="py-3 px-2 text-zinc-700">
                                            <span className="inline-flex items-center gap-1">
                                                <CreditCard size={14} className="text-zinc-400" />
                                                {formatBdt(o.total)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span
                                                className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${o.paymentStatus === "PAID"
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "bg-amber-50 text-amber-600"
                                                    }`}
                                            >
                                                {o.paymentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ShoppingBag size={36} className="text-zinc-200 mb-3" />
                        <p className="text-zinc-500 text-sm">No orders yet.</p>
                        <p className="text-zinc-400 text-xs mt-1">Your shop orders will appear here.</p>
                    </div>
                )}
            </TiltCard>

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
