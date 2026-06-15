"use client";

import { motion } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
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
                {/* Dojo Details Card */}
                <TiltCard dark delay={0.2} className="p-8">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-[60px]" />
                    <div className="relative z-10">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-blue-200 font-bold mb-4">
                            Dojo Information
                        </p>
                        <h3 className="text-2xl font-bold mb-1">{dojo?.name ?? "No Dojo Assigned"}</h3>
                        <p className="text-blue-200 text-sm mb-6">{dojo?.city ?? "—"}</p>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-500/30">
                            <div>
                                <p className="text-[10px] tracking-widest uppercase text-blue-300">Head Instructor</p>
                                <p className="text-sm font-semibold mt-0.5">{member?.fullName ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] tracking-widest uppercase text-blue-300">Active Students</p>
                                <p className="text-sm font-semibold mt-0.5">{dojoMembers.length}</p>
                            </div>
                        </div>
                    </div>
                </TiltCard>

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
        </div>
    );
}
