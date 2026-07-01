"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import {
    awardManualAchievement,
    evaluateAchievements,
} from "@/lib/achievements/evaluate";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";

/**
 * Toggle attendance for a single (member, date). Re-runs the achievement
 * engine for the affected member when they get marked present.
 *
 * Date is passed as YYYY-MM-DD so the server can interpret it as a local
 * calendar day (Attendance.date is a DATE column).
 */
export async function setAttendanceAction(opts: {
    memberId: string;
    dateYmd: string; // "2026-06-30"
    present: boolean;
}): Promise<{ ok: true; unlocked: string[] } | { error: string }> {
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) return { error: "Your dojo is not approved yet." };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.dateYmd)) {
        return { error: "Invalid date." };
    }
    const date = new Date(`${opts.dateYmd}T00:00:00Z`);

    // Confirm the student belongs to this dojo (defence in depth against
    // a forged form post).
    const student = await prisma.student.findFirst({
        where: { id: opts.memberId, dojoId: session.dojo.id },
        select: { id: true },
    });
    if (!student) return { error: "Student not found in this dojo." };

    await prisma.attendance.upsert({
        where: { studentId_date: { studentId: opts.memberId, date } },
        create: {
            studentId: opts.memberId,
            dojoId: session.dojo.id,
            date,
            present: opts.present,
        },
        update: { present: opts.present, dojoId: session.dojo.id },
    });

    let unlocked: string[] = [];
    if (opts.present) {
        const newly = await evaluateAchievements(opts.memberId);
        unlocked = newly.map((u) => u.name);
    }

    revalidatePath("/portal/dojo/attendance");
    return { ok: true, unlocked };
}

/**
 * Manually award a MANUAL-rule achievement to a student. Only achievements
 * whose catalog rule is MANUAL can be awarded this way — auto ones flow
 * through evaluateAchievements so progress metrics stay honest.
 */
export async function awardAchievementAction(opts: {
    memberId: string;
    achievementSlug: string;
    note?: string;
}): Promise<{ ok: true } | { error: string }> {
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) return { error: "Your dojo is not approved yet." };

    const entry = ACHIEVEMENT_CATALOG.find((a) => a.slug === opts.achievementSlug);
    if (!entry || entry.rule !== "MANUAL") {
        return { error: "That achievement is not awardable by hand." };
    }

    const student = await prisma.student.findFirst({
        where: { id: opts.memberId, dojoId: session.dojo.id },
        select: { id: true },
    });
    if (!student) return { error: "Student not found in this dojo." };

    const ok = await awardManualAchievement({
        memberId: opts.memberId,
        achievementSlug: opts.achievementSlug,
        awardedById: session.userId,
        note: opts.note?.trim() || undefined,
    });
    if (!ok) return { error: "Already awarded or could not save." };

    revalidatePath("/portal/dojo/attendance");
    return { ok: true };
}
