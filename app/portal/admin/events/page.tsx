import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Users, ArrowRight, Pencil } from "lucide-react";
import EventForm from "@/components/dojo/events/event-form";
import DeleteEventButton from "@/components/dojo/events/delete-button";
import PostedNewTabs, { type TabValue } from "@/components/portal/posted-new-tabs";
import Pager from "@/components/portal/pager";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Events — Admin",
};

export const dynamic = "force-dynamic";

const BASE = "/portal/admin/events";
const PAGE_SIZE = 10;

const CATEGORY_LABEL: Record<string, string> = {
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    TOURNAMENT: "Tournament",
    // Legacy values still present on old rows.
    BELT_TEST: "Belt Test",
    OTHER: "Event",
};

function formatDate(d: Date): string {
    return d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default async function AdminEventsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; page?: string }>;
}) {
    await requireAdmin();
    const sp = await searchParams;
    const tab: TabValue = sp.tab === "new" ? "new" : "posted";
    const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

    const total = await prisma.event.count();
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);

    const events =
        tab === "posted"
            ? await prisma.event.findMany({
                  orderBy: { eventDate: "desc" },
                  take: PAGE_SIZE,
                  skip: (safePage - 1) * PAGE_SIZE,
                  include: {
                      dojo: { select: { id: true, name: true } },
                      postedBy: { select: { fullName: true } },
                      _count: { select: { registrations: true } },
                  },
              })
            : [];

    const beltRanks =
        tab === "new"
            ? await prisma.beltRank.findMany({
                  orderBy: { orderIndex: "asc" },
                  select: { id: true, name: true },
              })
            : [];

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
                <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                        Federation
                    </p>
                    <h1 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15]">
                        Events
                    </h1>
                    <p className="text-zinc-600 mt-3 max-w-2xl leading-relaxed">
                        Belt tests, tournaments, seminars, and training camps. Federation-wide events sit alongside dojo-scoped events here for moderation.
                    </p>
                </div>
            </div>

            <PostedNewTabs current={tab} basePath={BASE} postedCount={total} />

            {tab === "new" ? (
                <div className="max-w-4xl">
                    <EventForm
                        eyebrow="New federation event"
                        submitLabel="Publish to landing page"
                        redirectAfter={BASE}
                        beltRanks={beltRanks}
                    />
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-sm text-zinc-500 text-center">
                    No events yet. Switch to <b>New</b> to create the first.
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
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        href={`/portal/admin/events/${e.id}/edit`}
                                        aria-label="Edit event"
                                        className="p-1.5 rounded-sm text-zinc-500 hover:text-accent-red hover:bg-accent-red/5 border border-transparent hover:border-accent-red/20 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </Link>
                                    <DeleteEventButton id={e.id} />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                                    {CATEGORY_LABEL[e.category] ?? e.category}
                                </span>
                                <span
                                    className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${
                                        e.dojoId
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-accent-red/10 text-accent-red border-accent-red/20"
                                    }`}
                                >
                                    {e.dojo?.name ?? "Federation"}
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
                                {e.isPremium && (
                                    <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                        Paid
                                    </span>
                                )}
                                {e.isPremium && e.memberDiscountPercent > 0 && (
                                    <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Member −{e.memberDiscountPercent}%
                                    </span>
                                )}
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
                                href={`/portal/admin/events/${e.id}/participants`}
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
