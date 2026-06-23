import type { Metadata } from "next";
import { Check, QrCode } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Attendance — Dojo Dashboard",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type Row = {
    name: string;
    attended: boolean[];
};

const SAMPLE: Row[] = [
    { name: "Tahmid Rahman", attended: [true, true, false, true, true] },
    { name: "Anika Hossain", attended: [true, false, true, true, true] },
    { name: "Ibrahim Khan", attended: [true, true, true, true, false] },
    {
        name: "Sumaiya Chowdhury",
        attended: [false, true, true, false, true],
    },
];

export default async function AttendancePage() {
    const session = await requireDojoRole("DOJO_INSTRUCTOR");

    const rows: Row[] = session.dojo
        ? await loadRealAttendance(session.dojo.id)
        : SAMPLE;

    return (
        <>
            <DojoPageHeader
                eyebrow="This week"
                title="Attendance"
                description={
                    session.dojo
                        ? `Mon–Fri check-ins for ${session.dojo.name}.`
                        : "Sample week shown until your dojo is approved."
                }
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <QrCode size={14} />
                        Show check-in QR
                    </button>
                }
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                {rows.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500 text-sm">
                        No attendance recorded this week yet.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                <th className="px-5 py-3">Student</th>
                                {DAYS.map((d) => (
                                    <th
                                        key={d}
                                        className="px-3 py-3 text-center"
                                    >
                                        {d}
                                    </th>
                                ))}
                                <th className="px-5 py-3 text-center">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((s) => {
                                const total = s.attended.filter(Boolean).length;
                                const pct = Math.round(
                                    (total / s.attended.length) * 100
                                );
                                return (
                                    <tr
                                        key={s.name}
                                        className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                    >
                                        <td className="px-5 py-3 font-semibold text-zinc-900">
                                            {s.name}
                                        </td>
                                        {s.attended.map((a, i) => (
                                            <td
                                                key={i}
                                                className="px-3 py-3 text-center"
                                            >
                                                <span
                                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                                                        a
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-zinc-100 text-zinc-300"
                                                    }`}
                                                >
                                                    {a && <Check size={14} />}
                                                </span>
                                            </td>
                                        ))}
                                        <td className="px-5 py-3 text-center font-mono font-bold text-zinc-700">
                                            {pct}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}

async function loadRealAttendance(dojoId: string): Promise<Row[]> {
    // Window: Monday → Friday of the current week.
    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - (day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const members = await prisma.member.findMany({
        where: { dojoId, isActive: true },
        orderBy: { fullName: "asc" },
        select: {
            id: true,
            fullName: true,
            attendance: {
                where: { date: { gte: monday, lte: friday } },
                select: { date: true, present: true },
            },
        },
    });

    return members.map((m) => {
        const grid: boolean[] = [false, false, false, false, false];
        for (const a of m.attendance) {
            const idx = Math.floor(
                (a.date.getTime() - monday.getTime()) /
                    (24 * 60 * 60 * 1000)
            );
            if (idx >= 0 && idx < 5) grid[idx] = a.present;
        }
        return { name: m.fullName, attended: grid };
    });
}
