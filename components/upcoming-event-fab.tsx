import { prisma } from "@/lib/prisma";
import UpcomingEventFabClient, {
    type FabEvent,
} from "./upcoming-event-fab-client";

export const dynamic = "force-dynamic";

export default async function UpcomingEventFab() {
    const next = await prisma.event.findFirst({
        where: {
            isPublished: true,
            eventDate: { gte: new Date() },
        },
        orderBy: { eventDate: "asc" },
        include: { dojo: { select: { name: true } } },
    });

    if (!next) return null;

    const event: FabEvent = {
        id: next.id,
        title: next.title,
        eventDate: next.eventDate.toISOString(),
        location: next.location,
        category: next.category,
        dojoName: next.dojo?.name ?? null,
    };

    return <UpcomingEventFabClient event={event} />;
}
