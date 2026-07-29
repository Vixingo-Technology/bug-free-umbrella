import { notFound, redirect } from "next/navigation";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import EventDetailClient from "@/components/dojo/gradings/event-detail-client";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) redirect("/portal/dojo");

  const event = await prisma.gradingEvent.findFirst({
    where: {
      id: eventId,
      applications: { some: { student: { dojoId: session.dojo.id } } },
    },
    include: {
      applications: {
        include: {
          student: {
            select: { id: true, currentRank: true, user: { select: { fullName: true } } },
          },
          targetRank: { select: { id: true, name: true } },
        },
        orderBy: { appliedAt: "asc" },
      },
      gradings: {
        select: {
          id: true,
          studentId: true,
          result: true,
          marks: true,
          notes: true,
          toRankId: true,
          fromRankId: true,
        },
      },
    },
  });
  if (!event) notFound();

  return (
    <EventDetailClient
      viewerRole={session.role}
      event={{
        id: event.id,
        name: event.name,
        eventDate: event.eventDate.toISOString(),
        location: event.location,
        notes: event.notes,
        cancelledAt: event.cancelledAt?.toISOString() ?? null,
        cancelReason: event.cancelReason,
        resultsPublishedAt: event.resultsPublishedAt?.toISOString() ?? null,
      }}
      applications={event.applications.map((a) => ({
        id: a.id,
        memberId: a.studentId,
        memberName: a.student.user.fullName,
        currentRank: a.student.currentRank,
        targetRankId: a.targetRankId,
        targetRankName: a.targetRank?.name ?? null,
        status: a.status,
      }))}
      gradings={event.gradings.map((g) => ({ ...g, memberId: g.studentId }))}
    />
  );
}
