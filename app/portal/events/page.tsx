import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { countUniqueParticipantsByEvent } from "@/lib/events/participant-count";
import EventsClient from "@/components/portal/events-client";

export default async function EventsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let upcomingEvents: any[] = [];
    let pastEvents: any[] = [];
    let myRegistrations: string[] = [];

    try {
        const now = new Date();

        // Decimal fields (ticketPrice) aren't serializable across the
        // server→client boundary — convert to plain numbers.
        const rows = await prisma.event.findMany({
            where: { isPublished: true, eventDate: { gte: now } },
            orderBy: { eventDate: "asc" },
            include: {
                minRank: { select: { name: true } },
            },
        });
        // Distinct participants per event — dedupes multi-division submits.
        const rsvpCounts = await countUniqueParticipantsByEvent(
            rows.map((e) => e.id),
        );
        upcomingEvents = rows.map((e) => ({
            ...e,
            ticketPrice: e.ticketPrice ? Number(e.ticketPrice) : null,
            rsvpCount: rsvpCounts.get(e.id) ?? 0,
        }));

        pastEvents = (
            await prisma.event.findMany({
                where: { isPublished: true, eventDate: { lt: now } },
                orderBy: { eventDate: "desc" },
                take: 6,
            })
        ).map((e) => ({
            ...e,
            ticketPrice: e.ticketPrice ? Number(e.ticketPrice) : null,
        }));

        const regs = await prisma.eventRegistration.findMany({
            where: { userId: user.id },
            select: { eventId: true },
        });
        myRegistrations = regs.map((r: any) => r.eventId);
    } catch {
        // DB not configured
    }

    return (
        <EventsClient
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            myRegistrations={myRegistrations}
            userId={user.id}
        />
    );
}
