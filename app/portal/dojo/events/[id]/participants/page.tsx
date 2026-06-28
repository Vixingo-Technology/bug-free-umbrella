import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import EventParticipantsList from "@/components/portal/event-participants-list";

export const metadata: Metadata = {
    title: "Participants — Dojo",
};

export const dynamic = "force-dynamic";

export default async function DojoEventParticipantsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ page?: string }>;
}) {
    const session = await requireDojoRole("DOJO_OWNER");
    const { id } = await params;
    const { page } = await searchParams;
    const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

    // Ownership guard: only the event's dojo (or the original poster) may view.
    const event = await prisma.event.findUnique({
        where: { id },
        select: { id: true, dojoId: true, postedById: true },
    });
    if (!event) notFound();
    const ownsByDojo = event.dojoId && session.dojo && event.dojoId === session.dojo.id;
    const ownsByPost = event.postedById === session.userId;
    if (!ownsByDojo && !ownsByPost) {
        redirect("/portal/dojo/events?denied=1");
    }

    return (
        <EventParticipantsList
            eventId={id}
            basePath={`/portal/dojo/events/${id}/participants`}
            backPath="/portal/dojo/events"
            page={pageNum}
        />
    );
}
