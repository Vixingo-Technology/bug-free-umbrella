import type { Metadata } from "next";
import { CalendarPlus, MapPin, Users } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Events — Dojo Dashboard",
};

const EVENTS = [
    {
        title: "Summer kata seminar",
        date: "Sat, 12 Jul · 4–7 PM",
        location: "Main floor",
        attendees: 28,
        audience: "Brown and above",
        status: "PUBLISHED",
    },
    {
        title: "Junior kumite friendly",
        date: "Sun, 27 Jul · 10 AM",
        location: "Main floor",
        attendees: 14,
        audience: "Ages 8–12",
        status: "PUBLISHED",
    },
    {
        title: "Visiting Sensei welcome dinner",
        date: "Fri, 5 Sep · 7 PM",
        location: "Off-site · Café Mango",
        attendees: 0,
        audience: "All members",
        status: "DRAFT",
    },
];

export default async function EventsPage() {
    await requireDojoRole("DOJO_OWNER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Events"
                description="Plan dojo-specific seminars, friendlies, and gatherings. Members are notified automatically."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <CalendarPlus size={14} />
                        New event
                    </button>
                }
            />

            <div className="grid md:grid-cols-2 gap-5">
                {EVENTS.map((e) => (
                    <div
                        key={e.title}
                        className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="font-serif font-bold text-lg text-zinc-900">
                                {e.title}
                            </h3>
                            <span
                                className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${
                                    e.status === "PUBLISHED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                }`}
                            >
                                {e.status}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-accent-red mb-3">
                            {e.date}
                        </p>
                        <ul className="space-y-1.5 text-xs text-zinc-600">
                            <li className="flex items-center gap-2">
                                <MapPin size={12} className="text-zinc-400" />
                                {e.location}
                            </li>
                            <li className="flex items-center gap-2">
                                <Users size={12} className="text-zinc-400" />
                                {e.attendees} RSVPs · {e.audience}
                            </li>
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
}
