import { prisma } from "@/lib/prisma";
import UpcomingEventFabClient, {
    type FabEvent,
} from "./upcoming-event-fab-client";

export const dynamic = "force-dynamic";

export default async function UpcomingEventFab() {
    const rows = await prisma.event.findMany({
        where: {
            isPublished: true,
            eventDate: { gte: new Date() },
        },
        orderBy: { eventDate: "asc" },
        take: 5,
        include: { dojo: { select: { name: true } } },
    });

    if (rows.length === 0) return null;

    const events: FabEvent[] = rows.map((e) => ({
        id: e.id,
        title: e.title,
        eventDate: e.eventDate.toISOString(),
        location: e.location,
        category: e.category,
        dojoName: e.dojo?.name ?? null,
    }));

    return <UpcomingEventFabClient events={events} />;
}
