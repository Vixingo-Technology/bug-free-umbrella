import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin, FileText, ImageIcon } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ArchiveFilters from "@/components/archive-filters";
import { prisma } from "@/lib/prisma";
import type { EventCategory } from "@/prisma/generated/client";
import { DEFAULT_TIME_ZONE, getDatePart } from "@/lib/format/datetime";

export const metadata: Metadata = {
    title: "Announcements & Events — JKA Bangladesh",
    description:
        "All announcements and events from JKA Bangladesh and its branch dojos.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const CATEGORY_LABEL: Record<string, string> = {
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    TOURNAMENT: "Tournament",
    // Legacy values still present on old rows.
    BELT_TEST: "Belt Test",
    OTHER: "Event",
};

const VALID_CATEGORIES = new Set<EventCategory>([
    "SEMINAR",
    "TRAINING_CAMP",
    "TOURNAMENT",
]);

type Row =
    | {
          kind: "ANNOUNCEMENT";
          id: string;
          title: string;
          body: string | null;
          date: Date;
          dojoName: string | null;
          hasAttachment: boolean;
          attachmentType: "IMAGE" | "PDF" | null;
      }
    | {
          kind: "EVENT";
          id: string;
          title: string;
          description: string | null;
          date: Date;
          eventDate: Date;
          location: string | null;
          category: EventCategory;
          dojoName: string | null;
          hasAttachment: boolean;
          attachmentType: "IMAGE" | "PDF" | null;
      };

function rangeFromYearMonth(
    year: number | null,
    month: number | null,
): { gte?: Date; lt?: Date } {
    if (year === null && month === null) return {};
    if (year !== null && month !== null) {
        const gte = new Date(Date.UTC(year, month - 1, 1));
        const lt = new Date(Date.UTC(year, month, 1));
        return { gte, lt };
    }
    if (year !== null) {
        return {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
        };
    }
    // month-only: no-op (would require cross-year scan; keep simple by ignoring)
    return {};
}

export default async function ArchivePage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        year?: string;
        month?: string;
        type?: string;
        category?: string;
    }>;
}) {
    const sp = await searchParams;
    const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
    const year = sp.year ? Number.parseInt(sp.year, 10) : null;
    const month = sp.month ? Number.parseInt(sp.month, 10) : null;
    const type = sp.type === "ANNOUNCEMENT" || sp.type === "EVENT" ? sp.type : null;
    const category =
        sp.category && VALID_CATEGORIES.has(sp.category as EventCategory)
            ? (sp.category as EventCategory)
            : null;

    const dateRange = rangeFromYearMonth(year, month);

    // Build queries conditionally — when filtering by category, skip announcements;
    // when filtering type=ANNOUNCEMENT, skip events.
    const fetchAnnouncements = type !== "EVENT" && !category;
    const fetchEvents = type !== "ANNOUNCEMENT";

    const [announcements, events, distinctYears] = await Promise.all([
        fetchAnnouncements
            ? prisma.announcement.findMany({
                  where: {
                      isPublished: true,
                      ...(dateRange.gte || dateRange.lt
                          ? {
                                publishedAt: {
                                    ...(dateRange.gte && { gte: dateRange.gte }),
                                    ...(dateRange.lt && { lt: dateRange.lt }),
                                },
                            }
                          : {}),
                  },
                  include: { dojo: { select: { name: true } } },
                  orderBy: { publishedAt: "desc" },
                  take: 200,
              })
            : Promise.resolve([] as never[]),
        fetchEvents
            ? prisma.event.findMany({
                  where: {
                      isPublished: true,
                      ...(category && { category }),
                      ...(dateRange.gte || dateRange.lt
                          ? {
                                createdAt: {
                                    ...(dateRange.gte && { gte: dateRange.gte }),
                                    ...(dateRange.lt && { lt: dateRange.lt }),
                                },
                            }
                          : {}),
                  },
                  include: { dojo: { select: { name: true } } },
                  orderBy: { createdAt: "desc" },
                  take: 200,
              })
            : Promise.resolve([] as never[]),
        // Years dropdown — distinct years that have *any* published content.
        // Pulled from a small recent slice; for an archive this is acceptable.
        getYearsWithContent(),
    ]);

    const rows: Row[] = [
        ...announcements.map((a) => ({
            kind: "ANNOUNCEMENT" as const,
            id: a.id,
            title: a.title,
            body: a.body,
            date: a.publishedAt,
            dojoName: a.dojo?.name ?? null,
            hasAttachment: !!a.attachmentUrl,
            attachmentType: a.attachmentType,
        })),
        ...events.map((e) => ({
            kind: "EVENT" as const,
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.createdAt,
            eventDate: e.eventDate,
            location: e.location,
            category: e.category,
            dojoName: e.dojo?.name ?? null,
            hasAttachment: !!e.attachmentUrl,
            attachmentType: e.attachmentType,
        })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const baseParams = new URLSearchParams();
    if (year !== null) baseParams.set("year", String(year));
    if (month !== null) baseParams.set("month", String(month));
    if (type) baseParams.set("type", type);
    if (category) baseParams.set("category", category);

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <section className="pt-32 pb-24">
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                        Archive
                    </p>
                    <h1 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                        Announcements & Events
                    </h1>
                    <div className="h-px w-24 bg-accent-red mb-8" />
                    <p className="text-zinc-600 mb-10 max-w-2xl leading-relaxed">
                        Every published notice, belt test, tournament, seminar and training camp from the federation and its branch dojos. Filter by year, month, category, or type.
                    </p>

                    <ArchiveFilters years={distinctYears} />

                    {visible.length === 0 ? (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-12 text-center text-sm text-zinc-500">
                            Nothing matches these filters yet.
                        </div>
                    ) : (
                        <ul className="bg-white border border-zinc-200 rounded-sm shadow-sm divide-y divide-zinc-150 overflow-hidden">
                            {visible.map((r) => (
                                <RowItem key={`${r.kind}-${r.id}`} row={r} />
                            ))}
                        </ul>
                    )}

                    {pageCount > 1 && (
                        <Pagination
                            page={safePage}
                            pageCount={pageCount}
                            baseParams={baseParams.toString()}
                        />
                    )}

                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 text-center mt-8">
                        Showing {visible.length} of {total} posts
                    </p>
                </div>
            </section>
            <Footer />
        </main>
    );
}

async function getYearsWithContent(): Promise<number[]> {
    // Cheap: just gather years from up to 500 most-recent of each table.
    const [aDates, eDates] = await Promise.all([
        prisma.announcement.findMany({
            where: { isPublished: true },
            select: { publishedAt: true },
            orderBy: { publishedAt: "desc" },
            take: 500,
        }),
        prisma.event.findMany({
            where: { isPublished: true },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 500,
        }),
    ]);
    const set = new Set<number>();
    for (const r of aDates) set.add(r.publishedAt.getUTCFullYear());
    for (const r of eDates) set.add(r.createdAt.getUTCFullYear());
    return [...set].sort((a, b) => b - a);
}

function RowItem({ row }: { row: Row }) {
    const day = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(row.date);
    const month = getDatePart(row.date, "monthShort").toUpperCase();
    const year = getDatePart(row.date, "year");

    const href =
        row.kind === "ANNOUNCEMENT"
            ? `/announcements/${row.id}`
            : `/events/${row.id}`;

    return (
        <li>
            <Link
                href={href}
                className="flex items-start gap-6 p-6 hover:bg-zinc-50/60 transition-colors group"
            >
                <div className="shrink-0 text-center min-w-[56px]">
                    <div className="text-2xl font-bold text-zinc-900 leading-none">
                        {day}
                    </div>
                    <div className="text-[10px] tracking-widest font-bold text-zinc-400 mt-1">
                        {month}
                    </div>
                    <div className="text-[10px] tracking-widest font-bold text-zinc-300 mt-0.5">
                        {year}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {row.kind === "ANNOUNCEMENT" ? (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600">
                                Announcement
                            </span>
                        ) : (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                                {CATEGORY_LABEL[row.category] ?? row.category}
                            </span>
                        )}
                        {row.dojoName && (
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                {row.dojoName}
                            </span>
                        )}
                        {row.hasAttachment && row.attachmentType && (
                            <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                {row.attachmentType === "PDF" ? (
                                    <FileText size={10} />
                                ) : (
                                    <ImageIcon size={10} />
                                )}
                                {row.attachmentType}
                            </span>
                        )}
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-zinc-900 group-hover:text-accent-red transition-colors mb-1">
                        {row.title}
                    </h3>
                    {row.kind === "EVENT" && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-5 text-xs text-zinc-500 mt-2">
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar
                                    size={12}
                                    className="text-accent-red"
                                />
                                {new Intl.DateTimeFormat("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                    timeZone: DEFAULT_TIME_ZONE,
                                }).format(row.eventDate)}
                            </span>
                            {row.location && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin
                                        size={12}
                                        className="text-accent-red"
                                    />
                                    {row.location}
                                </span>
                            )}
                        </div>
                    )}
                    {row.kind === "ANNOUNCEMENT" && row.body && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                            {row.body}
                        </p>
                    )}
                </div>
            </Link>
        </li>
    );
}

function Pagination({
    page,
    pageCount,
    baseParams,
}: {
    page: number;
    pageCount: number;
    baseParams: string;
}) {
    function href(p: number) {
        const next = new URLSearchParams(baseParams);
        if (p > 1) next.set("page", String(p));
        const qs = next.toString();
        return qs ? `/events?${qs}` : "/events";
    }

    // Compact page list: first, last, current ± 1, with ellipses.
    const pages: (number | "…")[] = [];
    const add = (n: number) => {
        if (!pages.includes(n)) pages.push(n);
    };
    add(1);
    for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < pageCount) add(p);
    }
    if (pageCount > 1) add(pageCount);
    const withEllipses: (number | "…")[] = [];
    for (let i = 0; i < pages.length; i++) {
        const n = pages[i];
        const prev = pages[i - 1];
        if (typeof n === "number" && typeof prev === "number" && n - prev > 1) {
            withEllipses.push("…");
        }
        withEllipses.push(n);
    }

    return (
        <nav className="flex items-center justify-center gap-1 mt-8 flex-wrap">
            <Link
                href={href(Math.max(1, page - 1))}
                aria-disabled={page === 1}
                className={`text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm border ${
                    page === 1
                        ? "border-zinc-100 text-zinc-300 pointer-events-none"
                        : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                }`}
            >
                Prev
            </Link>
            {withEllipses.map((n, i) =>
                n === "…" ? (
                    <span
                        key={`e-${i}`}
                        className="px-2 text-xs text-zinc-400"
                    >
                        …
                    </span>
                ) : (
                    <Link
                        key={n}
                        href={href(n)}
                        aria-current={n === page ? "page" : undefined}
                        className={`text-xs font-bold px-3 py-2 rounded-sm border min-w-[34px] text-center ${
                            n === page
                                ? "border-accent-red bg-accent-red text-white"
                                : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                        }`}
                    >
                        {n}
                    </Link>
                ),
            )}
            <Link
                href={href(Math.min(pageCount, page + 1))}
                aria-disabled={page === pageCount}
                className={`text-[10px] tracking-widest uppercase font-bold px-3 py-2 rounded-sm border ${
                    page === pageCount
                        ? "border-zinc-100 text-zinc-300 pointer-events-none"
                        : "border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                }`}
            >
                Next
            </Link>
        </nav>
    );
}
