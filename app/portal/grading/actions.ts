"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveNextRankForMember } from "@/lib/belt-rank";
import { notifyDojoStaff } from "@/lib/notify";

const NOTES_MAX = 500;

export async function requestBeltTestAction(
  notes?: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmedNotes = notes?.trim();
  if (trimmedNotes && trimmedNotes.length > NOTES_MAX) {
    return { error: `Notes must be ${NOTES_MAX} characters or fewer.` };
  }

  const member = await prisma.member.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      dojoId: true,
      membershipStatus: true,
      expiryDate: true,
    },
  });
  if (!member) return { error: "Could not load your profile." };

  // Eligibility: membership must be ACTIVE.
  if (member.membershipStatus !== "ACTIVE") {
    return { error: "Your membership is not active. Please renew before requesting a belt test." };
  }

  // Eligibility: no existing pending request.
  const existingPending = await prisma.gradingApplication.findFirst({
    where: { memberId: user.id, gradingEventId: null, status: "SUBMITTED" },
    select: { id: true },
  });
  if (existingPending) {
    return { error: "You already have a pending belt-test request." };
  }

  // Eligibility + target rank.
  const nextRank = await resolveNextRankForMember(user.id);
  if (!nextRank.ok) {
    if (nextRank.error.kind === "AT_TOP_RANK") {
      return { error: "You are already at the highest rank — congratulations!" };
    }
    return {
      error: `We could not resolve your current rank ("${nextRank.error.currentRank}"). Please speak with your dojo.`,
    };
  }

  try {
    await prisma.gradingApplication.create({
      data: {
        memberId: user.id,
        gradingEventId: null,
        targetRankId: nextRank.nextRank.id,
        status: "SUBMITTED",
        notes: trimmedNotes || null,
      },
    });

    if (member.dojoId) {
      await notifyDojoStaff(member.dojoId, {
        title: "New belt-test request",
        message: `${member.fullName} requested a ${nextRank.nextRank.name} test.`,
        type: "GRADING",
        link: "/portal/dojo/gradings",
      });
    }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to submit request." };
  }

  revalidatePath("/portal/grading");
  revalidatePath("/portal");
  return { success: true };
}

export async function withdrawRequestAction(
  applicationId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Load before deleting so we can notify the dojo staff after.
  const app = await prisma.gradingApplication.findFirst({
    where: {
      id: applicationId,
      memberId: user.id,
      gradingEventId: null,
      status: "SUBMITTED",
    },
    include: { member: { select: { fullName: true, dojoId: true } } },
  });
  if (!app) {
    return { error: "Request not found, or it has already been scheduled." };
  }

  await prisma.gradingApplication.delete({ where: { id: app.id } });

  if (app.member.dojoId) {
    await notifyDojoStaff(app.member.dojoId, {
      title: "Belt-test request withdrawn",
      message: `${app.member.fullName} withdrew their pending request.`,
      type: "GRADING",
      link: "/portal/dojo/gradings",
    });
  }

  revalidatePath("/portal/grading");
  revalidatePath("/portal");
  return { success: true };
}
