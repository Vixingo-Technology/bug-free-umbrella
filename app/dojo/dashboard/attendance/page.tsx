import type { Metadata } from "next";
import { Check, QrCode } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Attendance — Dojo Dashboard",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const SAMPLE = [
    { name: "Tahmid Rahman", attended: [true, true, false, true, true] },
    { name: "Anika Hossain", attended: [true, false, true, true, true] },
    { name: "Ibrahim Khan", attended: [true, true, true, true, false] },
    {
        name: "Sumaiya Chowdhury",
        attended: [false, true, true, false, true],
    },
    { name: "Rahim Uddin", attended: [true, true, true, true, true] },
];

export default async function AttendancePage() {
    await requireDojoRole("DOJO_INSTRUCTOR");
    return (
        <>
            <DojoPageHeader
                eyebrow="This week"
                title="Attendance"
                description="Mark attendance for each class, or let students self check-in via the dojo QR code."
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
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Student</th>
                            {DAYS.map((d) => (
                                <th key={d} className="px-3 py-3 text-center">
                                    {d}
                                </th>
                            ))}
                            <th className="px-5 py-3 text-center">Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SAMPLE.map((s) => {
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
            </div>
        </>
    );
}
