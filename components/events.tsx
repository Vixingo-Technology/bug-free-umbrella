import { prisma } from "@/lib/prisma";
import { siteContent } from "@/lib/i18n/site-content";
import EventsTabsClient, {
    type AnnouncementItem,
    type EventItem,
} from "./events-tabs-client";

export const dynamic = "force-dynamic";

export default async function Events() {
    const copy = siteContent;

    // Fetch upcoming, published events + recent announcements in parallel.
    // We fetch a small cap (8) — the section is a preview; full lists live on
    // dedicated pages.
    const [eventRows, announcementRows] = await Promise.all([
        prisma.event.findMany({
            where: {
                isPublished: true,
                eventDate: { gte: new Date() },
            },
            orderBy: { eventDate: "asc" },
            take: 4,
            include: { dojo: { select: { name: true } } },
        }),
        prisma.announcement.findMany({
            where: { isPublished: true },
            orderBy: { publishedAt: "desc" },
            take: 4,
            include: { dojo: { select: { name: true } } },
        }),
    ]);

    const events: EventItem[] = eventRows.map((e) => ({
        id: e.id,
        title: e.title,
        eventDate: e.eventDate.toISOString(),
        location: e.location,
        category: e.category,
        dojoName: e.dojo?.name ?? null,
    }));

    const announcements: AnnouncementItem[] = announcementRows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        link: a.link,
        publishedAt: a.publishedAt.toISOString(),
        dojoName: a.dojo?.name ?? null,
    }));

    return (
        <EventsTabsClient
            heading={copy.events.heading}
            viewAllLabel={copy.events.viewAll}
            announcements={announcements}
            events={events}
        />
    );
}
