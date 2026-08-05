import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import EventParticipantsList from "@/components/portal/event-participants-list";

export const metadata: Metadata = {
    title: "Participants — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminEventParticipantsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    return (
        <EventParticipantsList
            eventId={id}
            basePath={`/portal/admin/events/${id}/participants`}
            backPath="/portal/admin/events"
        />
    );
}
