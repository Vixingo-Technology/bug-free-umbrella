import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { resolveNextRankForMember } from "@/lib/belt-rank";
import GradingClient from "@/components/portal/grading-client";

export default async function GradingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let member: any = null;
  let currentRequest: any = null; // pending OR scheduled OR last declined
  let myGradings: any[] = [];
  let nextRankName: string | null = null;
  let blockReason: string | null = null;

  try {
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      include: { user: { select: { fullName: true } } },
    });
    if (student) {
      member = {
        id: student.id,
        fullName: student.user.fullName,
        currentRank: student.currentRank,
        membershipStatus: student.membershipStatus,
      };
    }

    // The "active" request for display: pending first, otherwise the most
    // recent scheduled/declined within the last 60 days.
    const pending = await prisma.gradingApplication.findFirst({
      where: { studentId: user.id, gradingEventId: null, status: "SUBMITTED" },
      include: { targetRank: true },
    });

    if (pending) {
      currentRequest = { kind: "pending", row: pending };
    } else {
      const recent = await prisma.gradingApplication.findFirst({
        where: { studentId: user.id },
        orderBy: { appliedAt: "desc" },
        include: { targetRank: true, gradingEvent: true },
      });
      if (recent) {
        if (
          recent.status === "APPROVED" &&
          recent.gradingEvent &&
          !recent.gradingEvent.cancelledAt &&
          !recent.gradingEvent.resultsPublishedAt &&
          recent.gradingEvent.eventDate >= new Date()
        ) {
          currentRequest = { kind: "scheduled", row: recent };
        } else if (recent.status === "CANCELLED") {
          currentRequest = { kind: "cancelled", row: recent };
        } else if (recent.status === "REJECTED" && recent.gradingEventId === null) {
          currentRequest = { kind: "declined", row: recent };
        }
      }
    }

    // History only includes published results (or legacy rows with no event).
    // Drafts that haven't been published yet must never leak to the member.
    myGradings = await prisma.grading.findMany({
      where: {
        studentId: user.id,
        OR: [
          { gradingEventId: null },
          { gradingEvent: { resultsPublishedAt: { not: null } } },
        ],
      },
      include: { fromRank: true, toRank: true, gradingEvent: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Compute the next-rank label and any block reason for the request button.
    if (member?.membershipStatus !== "ACTIVE") {
      blockReason = "Your membership is not active. Renew to request a belt test.";
    } else if (!currentRequest || currentRequest.kind !== "pending") {
      const next = await resolveNextRankForMember(user.id);
      if (next.ok) {
        nextRankName = next.nextRank.name;
      } else if (next.error.kind === "AT_TOP_RANK") {
        blockReason = "You are at the highest rank in our system 🎉";
      } else {
        blockReason = `We could not resolve your current rank ("${next.error.currentRank}"). Please speak with your dojo.`;
      }
    }
  } catch (err) {
    console.error("[GradingPage] Failed to load grading data:", err);
  }

  return (
    <GradingClient
      member={serialize(member)}
      currentRequest={serialize(currentRequest)}
      myGradings={serialize(myGradings)}
      nextRankName={nextRankName}
      blockReason={blockReason}
    />
  );
}
