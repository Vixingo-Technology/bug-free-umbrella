import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

        upcomingEvents = await prisma.event.findMany({
            where: { isPublished: true, eventDate: { gte: now } },
            orderBy: { eventDate: "asc" },
            include: {
                _count: { select: { registrations: true } },
            },
        });

        pastEvents = await prisma.event.findMany({
            where: { isPublished: true, eventDate: { lt: now } },
            orderBy: { eventDate: "desc" },
            take: 6,
        });

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
