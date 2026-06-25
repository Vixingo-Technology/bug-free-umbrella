"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import {
  buildScheduledNotification,
  buildDeclinedNotification,
  buildExamUpdatedNotification,
  buildExamCancelledNotification,
  buildResultPublishedNotification,
} from "@/lib/grading-notifications";
import type { GradingResult } from "@/prisma/generated/client";

export async function scheduleExamAction(input: {
  applicationIds: string[];
  name: string;
  eventDate: string;
  location?: string;
  notes?: string;
}): Promise<{ success: true; eventId: string } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  if (input.applicationIds.length === 0) {
    return { error: "Select at least one candidate." };
  }
  if (!input.name.trim()) return { error: "Event name is required." };

  const date = new Date(input.eventDate);
  if (Number.isNaN(date.getTime())) return { error: "Invalid date/time." };
  if (date.getTime() <= Date.now()) {
    return { error: "Exam date must be in the future." };
  }

  const dojoId = session.dojo.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Validate every application is pending AND belongs to this dojo.
      const apps = await tx.gradingApplication.findMany({
        where: {
          id: { in: input.applicationIds },
          gradingEventId: null,
          status: "SUBMITTED",
          member: { dojoId },
        },
        include: { targetRank: true },
      });

      if (apps.length !== input.applicationIds.length) {
        throw new Error(
          "Some selected requests are no longer eligible (already scheduled, withdrawn, or not in your dojo)."
        );
      }

      const event = await tx.gradingEvent.create({
        data: {
          name: input.name.trim(),
          eventDate: date,
          location: input.location?.trim() || null,
          notes: input.notes?.trim() || null,
          isOpen: false,
          targetRankId: null,
        },
      });

      await tx.gradingApplication.updateMany({
        where: { id: { in: apps.map((a) => a.id) } },
        data: { gradingEventId: event.id, status: "APPROVED" },
      });

      await tx.notification.createMany({
        data: apps.map((a) => {
          const payload = buildScheduledNotification({
            targetRankName: a.targetRank?.name ?? null,
            eventDate: date,
            location: event.location,
            eventName: event.name,
          });
          return {
            memberId: a.memberId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link,
          };
        }),
      });

      return { eventId: event.id };
    });

    revalidatePath("/dojo/dashboard/gradings");
    return { success: true, eventId: result.eventId };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to schedule exam." };
  }
}

export async function declineRequestAction(input: {
  applicationId: string;
  reason?: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  const dojoId = session.dojo.id;
  const reason = input.reason?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const app = await tx.gradingApplication.findFirst({
        where: {
          id: input.applicationId,
          gradingEventId: null,
          status: "SUBMITTED",
          member: { dojoId },
        },
      });
      if (!app) {
        throw new Error("Request not found or no longer pending.");
      }

      await tx.gradingApplication.update({
        where: { id: app.id },
        data: { status: "REJECTED", declineReason: reason },
      });

      const payload = buildDeclinedNotification({ reason });
      await tx.notification.create({
        data: {
          memberId: app.memberId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link,
        },
      });
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to decline request." };
  }

  revalidatePath("/dojo/dashboard/gradings");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled-event editing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the event belongs to the caller's dojo (via at least one application
 * tied to a member in that dojo). Throws if not found or already published.
 */
async function loadEditableEvent(eventId: string, dojoId: string) {
  const event = await prisma.gradingEvent.findFirst({
    where: {
      id: eventId,
      applications: { some: { member: { dojoId } } },
    },
    include: { applications: { include: { member: true, targetRank: true } } },
  });
  if (!event) throw new Error("Belt test not found in your dojo.");
  if (event.cancelledAt) throw new Error("This belt test has been cancelled.");
  if (event.resultsPublishedAt) throw new Error("Results are already published — no further changes allowed.");
  return event;
}

export async function updateScheduledExamAction(input: {
  eventId: string;
  name?: string;
  eventDate?: string;
  location?: string | null;
  notes?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.gradingEvent.findFirst({
        where: {
          id: input.eventId,
          applications: { some: { member: { dojoId: session.dojo!.id } } },
        },
        include: { applications: true },
      });
      if (!event) throw new Error("Belt test not found in your dojo.");
      if (event.cancelledAt) throw new Error("This belt test has been cancelled.");
      if (event.resultsPublishedAt) throw new Error("Results are already published.");

      const newName = input.name?.trim() || event.name;
      let newDate = event.eventDate;
      if (input.eventDate) {
        const d = new Date(input.eventDate);
        if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time.");
        if (d.getTime() <= Date.now()) throw new Error("Exam date must be in the future.");
        newDate = d;
      }
      const newLocation =
        input.location === undefined ? event.location : input.location?.trim() || null;
      const newNotes =
        input.notes === undefined ? event.notes : input.notes?.trim() || null;

      const dateChanged = newDate.getTime() !== event.eventDate.getTime();
      const locChanged = newLocation !== event.location;

      await tx.gradingEvent.update({
        where: { id: event.id },
        data: { name: newName, eventDate: newDate, location: newLocation, notes: newNotes },
      });

      // Only notify if something the student cares about changed.
      if (dateChanged || locChanged) {
        const memberIds = event.applications
          .filter((a) => a.status === "APPROVED")
          .map((a) => a.memberId);
        if (memberIds.length) {
          const payload = buildExamUpdatedNotification({
            eventName: newName,
            eventDate: newDate,
            location: newLocation,
          });
          await tx.notification.createMany({
            data: memberIds.map((memberId) => ({
              memberId,
              title: payload.title,
              message: payload.message,
              type: payload.type,
              link: payload.link,
            })),
          });
        }
      }
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update belt test." };
  }

  revalidatePath("/dojo/dashboard/gradings");
  revalidatePath(`/dojo/dashboard/gradings/${input.eventId}`);
  return { success: true };
}

export async function cancelScheduledExamAction(input: {
  eventId: string;
  reason?: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  const reason = input.reason?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.gradingEvent.findFirst({
        where: {
          id: input.eventId,
          applications: { some: { member: { dojoId: session.dojo!.id } } },
        },
        include: { applications: true },
      });
      if (!event) throw new Error("Belt test not found in your dojo.");
      if (event.cancelledAt) throw new Error("Already cancelled.");
      if (event.resultsPublishedAt) throw new Error("Results are already published — cannot cancel.");

      await tx.gradingEvent.update({
        where: { id: event.id },
        data: { cancelledAt: new Date(), cancelReason: reason },
      });

      const approved = event.applications.filter((a) => a.status === "APPROVED");
      if (approved.length) {
        await tx.gradingApplication.updateMany({
          where: { id: { in: approved.map((a) => a.id) } },
          data: { status: "CANCELLED" },
        });

        const payload = buildExamCancelledNotification({ eventName: event.name, reason });
        await tx.notification.createMany({
          data: approved.map((a) => ({
            memberId: a.memberId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link: payload.link,
          })),
        });
      }
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to cancel belt test." };
  }

  revalidatePath("/dojo/dashboard/gradings");
  revalidatePath(`/dojo/dashboard/gradings/${input.eventId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Results drafting + publishing
// ─────────────────────────────────────────────────────────────────────────────

export type DraftResultRow = {
  memberId: string;
  result: GradingResult; // PASSED | FAILED | ABSENT
  reviewNotes?: string | null;
};

/**
 * Upsert per-student draft Gradings on a scheduled (and not-yet-published)
 * event. PASSED rows set toRankId = the application's targetRankId; FAILED /
 * ABSENT rows set toRankId = fromRankId so history is preserved without any
 * rank change. The member's currentRank is *not* touched here — it only flips
 * on publish.
 */
export async function upsertDraftResultsAction(input: {
  eventId: string;
  rows: DraftResultRow[];
}): Promise<{ success: true } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  try {
    await prisma.$transaction(async (tx) => {
      const event = await loadEditableEvent(input.eventId, session.dojo!.id);

      // Build a lookup of (memberId → application) so we can resolve targetRankId
      // and the member's current rank for a fromRank snapshot.
      const appByMember = new Map(event.applications.map((a) => [a.memberId, a]));

      for (const row of input.rows) {
        const app = appByMember.get(row.memberId);
        if (!app) throw new Error("One or more candidates are not enrolled in this belt test.");

        const fromRank = await tx.beltRank.findUnique({
          where: { name: app.member.currentRank },
        });

        const toRankId =
          row.result === "PASSED" ? app.targetRankId : fromRank?.id ?? null;

        // One Grading per (member, event). Find existing draft if any.
        const existing = await tx.grading.findFirst({
          where: { memberId: row.memberId, gradingEventId: event.id },
        });

        if (existing) {
          await tx.grading.update({
            where: { id: existing.id },
            data: {
              result: row.result,
              fromRankId: fromRank?.id ?? null,
              toRankId,
              notes: row.reviewNotes?.trim() || null,
            },
          });
        } else {
          await tx.grading.create({
            data: {
              memberId: row.memberId,
              gradingEventId: event.id,
              result: row.result,
              fromRankId: fromRank?.id ?? null,
              toRankId,
              notes: row.reviewNotes?.trim() || null,
            },
          });
        }
      }
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to save draft results." };
  }

  revalidatePath(`/dojo/dashboard/gradings/${input.eventId}`);
  return { success: true };
}

/**
 * Publish drafted results: stamp resultsPublishedAt, flip member.currentRank
 * on PASSED grades, create notifications, and send emails. Everything except
 * email send is in one transaction so a partial publish can never happen.
 */
export async function publishResultsAction(input: {
  eventId: string;
}): Promise<{ success: true; published: number } | { error: string }> {
  const session = await requireDojoRole("INSTRUCTOR");
  if (!session.dojo) return { error: "Your dojo is not set up yet." };

  let publishedCount = 0;

  try {
    publishedCount = await prisma.$transaction(async (tx) => {
      const event = await loadEditableEvent(input.eventId, session.dojo!.id);

      const gradings = await tx.grading.findMany({
        where: { gradingEventId: event.id },
        include: { toRank: true },
      });

      if (gradings.length === 0) {
        throw new Error("Draft a result for every candidate before publishing.");
      }

      // Each enrolled (APPROVED) application must have a graded row.
      const approvedMemberIds = new Set(
        event.applications.filter((a) => a.status === "APPROVED").map((a) => a.memberId)
      );
      const gradedMemberIds = new Set(gradings.map((g) => g.memberId));
      for (const id of approvedMemberIds) {
        if (!gradedMemberIds.has(id)) {
          throw new Error("Some candidates have no draft result. Fill in everyone before publishing.");
        }
      }

      // Apply rank changes for PASSED + build the in-app notification fan-out.
      // The student sees the result via the realtime-subscribed badge + sound
      // in the portal navbar; no external email/WhatsApp side effects yet.
      const notifData: Array<{
        memberId: string;
        title: string;
        message: string;
        type: "GRADING";
        link: string;
      }> = [];

      for (const g of gradings) {
        if (g.result === "PASSED" && g.toRank?.name) {
          await tx.member.update({
            where: { id: g.memberId },
            data: { currentRank: g.toRank.name },
          });
        }
        const payload = buildResultPublishedNotification({
          passed: g.result === "PASSED",
          toRankName: g.toRank?.name ?? null,
        });
        notifData.push({
          memberId: g.memberId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link,
        });
      }

      await tx.notification.createMany({ data: notifData });

      await tx.gradingEvent.update({
        where: { id: event.id },
        data: { resultsPublishedAt: new Date() },
      });

      return gradings.length;
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to publish results." };
  }

  revalidatePath("/dojo/dashboard/gradings");
  revalidatePath(`/dojo/dashboard/gradings/${input.eventId}`);
  revalidatePath("/portal/grading");
  revalidatePath("/portal");
  return { success: true, published: publishedCount };
}
