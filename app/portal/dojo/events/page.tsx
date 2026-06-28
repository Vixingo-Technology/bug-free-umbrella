import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Users, ArrowRight } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import EventForm from "@/components/dojo/events/event-form";
import DeleteEventButton from "@/components/dojo/events/delete-button";
import PostedNewTabs, { type TabValue } from "@/components/portal/posted-new-tabs";
import Pager from "@/components/portal/pager";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Events — Dojo Dashboard",
};

export const dynamic = "force-dynamic";

const BASE = "/portal/dojo/events";
const PAGE_SIZE = 8;

const CATEGORY_LABEL: Record<string, string> = {
    BELT_TEST: "Belt Test",
    TOURNAMENT: "Tournament",
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    OTHER: "Event",
};

function formatDate(d: Date): string {
    return d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; page?: string }>;
}) {
    const session = await requireDojoRole("DOJO_OWNER");
    const sp = await searchParams;
    const tab: TabValue = sp.tab === "new" ? "new" : "posted";
    const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

    const where = session.dojo ? { dojoId: session.dojo.id } : { id: "__none__" };
    const total = await prisma.event.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);

    const events =
        tab === "posted"
            ? await prisma.event.findMany({
                  where,
                  orderBy: { eventDate: "desc" },
                  include: { _count: { select: { registrations: true } } },
                  take: PAGE_SIZE,
                  skip: (safePage - 1) * PAGE_SIZE,
              })
            : [];

    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Events"
                description="Plan dojo-specific belt tests, tournaments, seminars and gatherings. Published events appear on the federation landing page."
            />

            <PostedNewTabs current={tab} basePath={BASE} postedCount={total} />

            {tab === "new" ? (
                <div className="max-w-2xl">
                    <EventForm
                        eyebrow="New dojo event"
                        redirectAfter={BASE}
                    />
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-sm text-zinc-500 text-center">
                    No events yet. Switch to <b>New</b> to create your first.
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-5">
                    {events.map((e) => (
                        <div
                            key={e.id}
                            className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5"
                        >
                            <div className="flex items-start justify-between mb-3 gap-3">
                                <h3 className="font-serif font-bold text-lg text-zinc-900 flex-1">
                                    {e.title}
                                </h3>
                                <DeleteEventButton id={e.id} />
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                                    {CATEGORY_LABEL[e.category] ?? e.category}
                                </span>
                                <span
                                    className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${
                                        e.isPublished
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                    }`}
                                >
                                    {e.isPublished ? "Published" : "Hidden"}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-accent-red mb-3">
                                {formatDate(e.eventDate)}
                            </p>
                            <ul className="space-y-1.5 text-xs text-zinc-600">
                                {e.location && (
                                    <li className="flex items-center gap-2">
                                        <MapPin
                                            size={12}
                                            className="text-zinc-400"
                                        />
                                        {e.location}
                                    </li>
                                )}
                                <li className="flex items-center gap-2">
                                    <Users
                                        size={12}
                                        className="text-zinc-400"
                                    />
                                    {e._count.registrations} RSVPs
                                    {e.maxCapacity
                                        ? ` · cap ${e.maxCapacity}`
                                        : ""}
                                </li>
                            </ul>
                            <Link
                                href={`/portal/dojo/events/${e.id}/participants`}
                                className="mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                            >
                                View participants
                                <ArrowRight size={10} />
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {tab === "posted" && (
                <Pager page={safePage} pageCount={pageCount} basePath={BASE} />
            )}
        </>
    );
}
