"use client";

import { useState } from "react";
import { motion } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import DigitalCard from "@/components/portal/digital-card";
import MembershipCardDialog from "@/components/portal/membership-card-dialog";
import {
  Users,
  MapPin,
  Award,
  Swords,
  GraduationCap,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

interface InstructorDashboardProps {
    member: any;
    dojoMembers: any[];
    dojoGradings: any[];
}

type MembershipStatusLabel = "Active" | "Expired" | "Expiring Soon" | "Pending";

function deriveMembershipStatus(expiryDate: any): MembershipStatusLabel {
    if (!expiryDate) return "Active";
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= 30) return "Expiring Soon";
    return "Active";
}

function StatCard({
    icon,
    label,
    value,
    color,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    delay: number;
}) {
    return (
        <TiltCard delay={delay} className="p-6">
            <div className="flex items-center gap-4">
                <div className={`${color} p-3 rounded-xl`}>{icon}</div>
                <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-zinc-900 mt-0.5">{value}</p>
                </div>
            </div>
        </TiltCard>
    );
}

export default function InstructorDashboard({
    member,
    dojoMembers,
    dojoGradings,
}: InstructorDashboardProps) {
    const dojo = member?.dojo;
    const [cardOpen, setCardOpen] = useState(false);
    const membershipStatus = deriveMembershipStatus(member?.expiryDate);

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                    Instructor Portal — <span className="text-blue-600">{member?.fullName?.split(" ")[0] ?? "Sensei"}</span>
                </h1>
                <p className="text-zinc-500 mt-1">
                    Manage your dojo, students, and grading records.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<MapPin size={20} className="text-blue-600" />}
                    label="Your Dojo"
                    value={dojo?.name ?? "Not Assigned"}
                    color="bg-blue-50"
                    delay={0}
                />
                <StatCard
                    icon={<Users size={20} className="text-emerald-600" />}
                    label="Students"
                    value={`${dojoMembers.length}`}
                    color="bg-emerald-50"
                    delay={0.05}
                />
                <StatCard
                    icon={<Award size={20} className="text-amber-600" />}
                    label="Gradings Logged"
                    value={`${dojoGradings.length}`}
                    color="bg-amber-50"
                    delay={0.1}
                />
                <StatCard
                    icon={<Swords size={20} className="text-purple-600" />}
                    label="Your Rank"
                    value={member?.currentRank ?? "—"}
                    color="bg-purple-50"
                    delay={0.15}
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
                            fullName={member?.fullName ?? "Instructor"}
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

                {/* Grading Activity */}
                <TiltCard delay={0.25} className="p-8">
                    <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        Recent Gradings
                    </h2>
                    {dojoGradings.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {dojoGradings.map((g: any, i: number) => (
                                <div
                                    key={g.id ?? i}
                                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {g.result === "PASSED" ? (
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                        ) : g.result === "FAILED" ? (
                                            <XCircle size={16} className="text-red-500" />
                                        ) : (
                                            <Clock size={16} className="text-amber-500" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900">
                                                {g.member?.fullName ?? "Student"}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {g.fromRank?.nameEn ?? "—"} → {g.toRank?.nameEn ?? "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full ${g.result === "PASSED"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : g.result === "FAILED"
                                                ? "bg-red-50 text-red-600"
                                                : "bg-amber-50 text-amber-600"
                                            }`}
                                    >
                                        {g.result ?? "PENDING"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Award size={32} className="text-zinc-200 mb-3" />
                            <p className="text-zinc-500 text-sm">No grading records yet.</p>
                        </div>
                    )}
                </TiltCard>
            </div>

            {/* Student Roster */}
            <TiltCard delay={0.3} className="p-8">
                <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                    <Users size={18} className="text-emerald-500" />
                    Student Roster
                </h2>
                {dojoMembers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold border-b border-zinc-100">
                                    <th className="text-left py-3 px-2">Name</th>
                                    <th className="text-left py-3 px-2">Email</th>
                                    <th className="text-left py-3 px-2">Rank</th>
                                    <th className="text-left py-3 px-2">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dojoMembers.map((m: any, i: number) => (
                                    <tr key={m.id ?? i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                                        <td className="py-3 px-2 font-medium text-zinc-900">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap size={14} className="text-zinc-400" />
                                                {m.fullName}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-zinc-500">{m.email}</td>
                                        <td className="py-3 px-2 text-zinc-700">{m.currentRank ?? "White Belt"}</td>
                                        <td className="py-3 px-2">
                                            <span
                                                className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${m.role === "INSTRUCTOR"
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-emerald-50 text-emerald-600"
                                                    }`}
                                            >
                                                {m.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Users size={36} className="text-zinc-200 mb-3" />
                        <p className="text-zinc-500 text-sm">No students in your dojo yet.</p>
                    </div>
                )}
            </TiltCard>

            <MembershipCardDialog
                open={cardOpen}
                onClose={() => setCardOpen(false)}
                memberId={member?.id ?? ""}
                fullName={member?.fullName ?? "Instructor"}
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
