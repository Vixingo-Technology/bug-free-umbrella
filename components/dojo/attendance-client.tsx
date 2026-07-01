"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X, Award } from "lucide-react";
import {
    setAttendanceAction,
    awardAchievementAction,
} from "@/app/portal/dojo/attendance/actions";
import { TIER_STYLES } from "@/lib/achievements/catalog";
import type { AchievementTier } from "@/prisma/generated/client";

export type AttendanceMember = {
    id: string;
    fullName: string;
    attendance: boolean[];
    unlockedSlugs: string[];
};

type ManualAchievement = {
    slug: string;
    name: string;
    tier: AchievementTier;
    description: string;
};

type Props = {
    editable: boolean;
    weekDates: string[]; // YYYY-MM-DD × 5
    members: AttendanceMember[];
    manualAchievements: ManualAchievement[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function AttendanceClient({
    editable,
    weekDates,
    members: initialMembers,
    manualAchievements,
}: Props) {
    const [members, setMembers] = useState(initialMembers);
    const [toast, setToast] = useState<string | null>(null);
    const [awardFor, setAwardFor] = useState<AttendanceMember | null>(null);
    const [pendingCell, startCellTransition] = useTransition();

    function toggle(memberId: string, dayIndex: number) {
        if (!editable) return;
        const member = members.find((m) => m.id === memberId);
        if (!member) return;
        const next = !member.attendance[dayIndex];

        // Optimistic update.
        setMembers((prev) =>
            prev.map((m) =>
                m.id === memberId
                    ? {
                          ...m,
                          attendance: m.attendance.map((v, i) =>
                              i === dayIndex ? next : v,
                          ),
                      }
                    : m,
            ),
        );

        startCellTransition(async () => {
            const result = await setAttendanceAction({
                memberId,
                dateYmd: weekDates[dayIndex],
                present: next,
            });
            if ("error" in result) {
                // Roll back on failure.
                setMembers((prev) =>
                    prev.map((m) =>
                        m.id === memberId
                            ? {
                                  ...m,
                                  attendance: m.attendance.map((v, i) =>
                                      i === dayIndex ? !next : v,
                                  ),
                              }
                            : m,
                    ),
                );
                setToast(result.error);
            } else if (result.unlocked.length > 0) {
                setToast(
                    `🎉 ${member.fullName} unlocked: ${result.unlocked.join(", ")}`,
                );
            }
        });
        setTimeout(() => setToast(null), 4000);
    }

    return (
        <>
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                {members.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500 text-sm">
                        No students enrolled yet.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                <th className="px-5 py-3">Student</th>
                                {DAYS.map((d) => (
                                    <th key={d} className="px-3 py-3 text-center">{d}</th>
                                ))}
                                <th className="px-5 py-3 text-center">Rate</th>
                                {editable && (
                                    <th className="px-5 py-3 text-center">Award</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((s) => {
                                const total = s.attendance.filter(Boolean).length;
                                const pct = Math.round(
                                    (total / s.attendance.length) * 100,
                                );
                                return (
                                    <tr
                                        key={s.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                    >
                                        <td className="px-5 py-3 font-semibold text-zinc-900">
                                            {s.fullName}
                                        </td>
                                        {s.attendance.map((a, i) => (
                                            <td key={i} className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggle(s.id, i)}
                                                    disabled={!editable || pendingCell}
                                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all ${
                                                        a
                                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                            : "bg-zinc-100 text-zinc-300 hover:bg-zinc-200"
                                                    } ${editable ? "cursor-pointer" : "cursor-default"}`}
                                                    aria-label={`${s.fullName} ${DAYS[i]} ${a ? "present" : "absent"}`}
                                                >
                                                    {a && <Check size={14} />}
                                                </button>
                                            </td>
                                        ))}
                                        <td className="px-5 py-3 text-center font-mono font-bold text-zinc-700">
                                            {pct}%
                                        </td>
                                        {editable && (
                                            <td className="px-5 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setAwardFor(s)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold tracking-widest uppercase border border-amber-200 hover:bg-amber-100 transition-colors"
                                                >
                                                    <Sparkles size={12} />
                                                    Award
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm max-w-sm">
                    {toast}
                </div>
            )}

            {awardFor && (
                <AwardDialog
                    member={awardFor}
                    achievements={manualAchievements}
                    onClose={(unlockedName) => {
                        if (unlockedName) {
                            setMembers((prev) =>
                                prev.map((m) =>
                                    m.id === awardFor.id
                                        ? {
                                              ...m,
                                              unlockedSlugs: [
                                                  ...m.unlockedSlugs,
                                                  unlockedName,
                                              ],
                                          }
                                        : m,
                                ),
                            );
                            setToast(`🌟 Awarded to ${awardFor.fullName}`);
                            setTimeout(() => setToast(null), 4000);
                        }
                        setAwardFor(null);
                    }}
                />
            )}
        </>
    );
}

function AwardDialog({
    member,
    achievements,
    onClose,
}: {
    member: AttendanceMember;
    achievements: ManualAchievement[];
    onClose: (unlockedSlug: string | null) => void;
}) {
    const [selected, setSelected] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function submit() {
        if (!selected) return;
        setError(null);
        startTransition(async () => {
            const result = await awardAchievementAction({
                memberId: member.id,
                achievementSlug: selected,
                note: note || undefined,
            });
            if ("error" in result) {
                setError(result.error);
            } else {
                onClose(selected);
            }
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => onClose(null)}
        >
            <div
                className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                            Award achievement
                        </p>
                        <h2 className="font-bold text-zinc-900 text-lg mt-0.5">
                            {member.fullName}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => onClose(null)}
                        className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <p className="text-xs text-zinc-500">
                        Manual achievements are special recognitions only the dojo
                        can hand out. Auto-unlock achievements (e.g. attendance
                        milestones) are awarded by the system as your students train.
                    </p>

                    <div className="space-y-2">
                        {achievements.map((a) => {
                            const already = member.unlockedSlugs.includes(a.slug);
                            const isSelected = selected === a.slug;
                            const tier = TIER_STYLES[a.tier];
                            return (
                                <button
                                    type="button"
                                    key={a.slug}
                                    disabled={already}
                                    onClick={() => setSelected(a.slug)}
                                    className={`w-full text-left p-3 border rounded-lg transition-all ${
                                        already
                                            ? "opacity-50 cursor-not-allowed border-zinc-200 bg-zinc-50"
                                            : isSelected
                                              ? `${tier.ring} ${tier.bg} ring-2 ring-offset-1 ring-accent-red`
                                              : "border-zinc-200 hover:border-zinc-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tier.bg} ${tier.ring} border`}>
                                            <Award size={16} className={tier.text} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm text-zinc-900">
                                                    {a.name}
                                                </p>
                                                <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${tier.chip}`}>
                                                    {tier.label}
                                                </span>
                                                {already && (
                                                    <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                                                        Awarded
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {a.description}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div>
                        <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Note (optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="What did they do to earn this?"
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-red"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onClose(null)}
                        className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!selected || isPending}
                        onClick={submit}
                        className="px-5 py-2 bg-accent-red text-white text-sm font-bold tracking-widest uppercase rounded-lg hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        {isPending && <Loader2 size={14} className="animate-spin" />}
                        Award
                    </button>
                </div>
            </div>
        </div>
    );
}
