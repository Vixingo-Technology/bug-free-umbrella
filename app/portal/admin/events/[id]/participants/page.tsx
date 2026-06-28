import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import EventParticipantsList from "@/components/portal/event-participants-list";

export const metadata: Metadata = {
    title: "Participants — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminEventParticipantsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ page?: string }>;
}) {
    await requireAdmin();
    const { id } = await params;
    const { page } = await searchParams;
    const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

    return (
        <EventParticipantsList
            eventId={id}
            basePath={`/portal/admin/events/${id}/participants`}
            backPath="/portal/admin/events"
            page={pageNum}
        />
    );
}
