import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";

export const metadata: Metadata = {
    title: "Schedule — Dojo Dashboard",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];

type Slot = {
    day: number;
    hour: number;
    title: string;
    audience: string;
};

const SLOTS: Slot[] = [
    { day: 0, hour: 2, title: "Junior kihon", audience: "Ages 8–12" },
    { day: 0, hour: 3, title: "Senior kata", audience: "Brown & Black" },
    { day: 1, hour: 2, title: "Beginner basics", audience: "White – Orange" },
    { day: 2, hour: 2, title: "Junior kihon", audience: "Ages 8–12" },
    { day: 2, hour: 3, title: "Kumite drills", audience: "Green and above" },
    { day: 3, hour: 2, title: "Beginner basics", audience: "White – Orange" },
    {
        day: 4,
        hour: 3,
        title: "Visiting Sensei seminar",
        audience: "All ranks",
    },
    {
        day: 5,
        hour: 1,
        title: "Saturday open mat",
        audience: "All ranks",
    },
];

export default async function SchedulePage() {
    await requireDojoRole("INSTRUCTOR");
    return (
        <>
            <DojoPageHeader
                eyebrow="Weekly planner"
                title="Schedule"
                description="Plan the week ahead. Drag classes between slots; students see the public calendar instantly."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <CalendarPlus size={14} />
                        Add class
                    </button>
                }
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-200">
                            <th className="px-4 py-3 text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 w-20">
                                Time
                            </th>
                            {DAYS.map((d) => (
                                <th
                                    key={d}
                                    className="px-4 py-3 text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400"
                                >
                                    {d}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {HOURS.map((h, hourIdx) => (
                            <tr
                                key={h}
                                className="border-b border-zinc-100 align-top"
                            >
                                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                                    {h}
                                </td>
                                {DAYS.map((_, dayIdx) => {
                                    const slot = SLOTS.find(
                                        (s) =>
                                            s.day === dayIdx &&
                                            s.hour === hourIdx
                                    );
                                    return (
                                        <td
                                            key={`${dayIdx}-${hourIdx}`}
                                            className="px-2 py-2 align-top"
                                        >
                                            {slot ? (
                                                <div className="bg-accent-red/10 border-l-2 border-accent-red rounded-sm px-3 py-2">
                                                    <p className="text-sm font-semibold text-zinc-900 leading-tight">
                                                        {slot.title}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                                        {slot.audience}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="h-12 rounded-sm border border-dashed border-zinc-200 hover:border-accent-red/40 transition-colors" />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
