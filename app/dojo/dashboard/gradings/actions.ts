"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import {
  buildScheduledNotification,
  buildDeclinedNotification,
} from "@/lib/grading-notifications";

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
  if (date.getTime() < Date.now()) {
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
