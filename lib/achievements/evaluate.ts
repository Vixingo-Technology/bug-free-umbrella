/**
 * Achievement evaluation engine.
 *
 * Given a studentId, recomputes auto-rule achievements and upserts
 * StudentAchievement rows for any that have crossed their threshold.
 */

import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";

export type UnlockedAchievement = {
    slug: string;
    name: string;
    tier: string;
};

/** Count the longest current attendance streak (looking back from today). */
async function getConsecutiveAttendance(studentId: string): Promise<number> {
    const rows = await prisma.attendance.findMany({
        where: { studentId, present: true },
        orderBy: { date: "desc" },
        take: 60,
        select: { date: true },
    });
    if (rows.length === 0) return 0;

    const days = rows
        .map((r) => {
            const d = new Date(r.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })
        .sort((a, b) => b - a);

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
        const diffDays = (days[i - 1] - days[i]) / (24 * 60 * 60 * 1000);
        if (diffDays <= 3) streak++;
        else break;
    }
    return streak;
}

async function gatherMetrics(studentId: string): Promise<Record<string, number>> {
    const [attendanceCount, gradingsPassed, eventsAttended, tournaments, tournamentWins, certificates, streak] =
        await Promise.all([
            prisma.attendance.count({ where: { studentId, present: true } }),
            prisma.grading.count({ where: { studentId, result: "PASSED" } }),
            prisma.eventRegistration.count({
                where: { userId: studentId, checkedInAt: { not: null } },
            }),
            prisma.tournamentParticipant.count({ where: { userId: studentId } }),
            prisma.tournamentMatch.count({
                where: {
                    OR: [
                        { participant1: { userId: studentId } },
                        { participant2: { userId: studentId } },
                    ],
                    winner: { userId: studentId },
                },
            }),
            prisma.grading.count({
                where: { studentId, result: "PASSED", certificateUrl: { not: null } },
            }),
            getConsecutiveAttendance(studentId),
        ]);

    return {
        ATTENDANCE_COUNT: attendanceCount,
        CONSECUTIVE_ATTENDANCE: streak,
        GRADINGS_PASSED: gradingsPassed,
        EVENTS_ATTENDED: eventsAttended,
        TOURNAMENTS_PARTICIPATED: tournaments,
        TOURNAMENT_WINS: tournamentWins,
        CERTIFICATES_EARNED: certificates,
    };
}

export async function evaluateAchievements(studentId: string): Promise<UnlockedAchievement[]> {
    if (!studentId) return [];

    const existing = await prisma.studentAchievement.findMany({
        where: { studentId },
        select: { achievement: { select: { slug: true } } },
    });
    const alreadyUnlocked = new Set(existing.map((r) => r.achievement.slug));

    const metrics = await gatherMetrics(studentId);

    const candidates = ACHIEVEMENT_CATALOG.filter(
        (a) =>
            a.rule !== "MANUAL" &&
            typeof a.threshold === "number" &&
            !alreadyUnlocked.has(a.slug) &&
            (metrics[a.rule] ?? 0) >= a.threshold,
    );

    if (candidates.length === 0) return [];

    const dbRows = await prisma.achievement.findMany({
        where: { slug: { in: candidates.map((c) => c.slug) } },
        select: { id: true, slug: true },
    });
    const slugToId = new Map(dbRows.map((r) => [r.slug, r.id]));

    const unlocked: UnlockedAchievement[] = [];
    for (const c of candidates) {
        const achievementId = slugToId.get(c.slug);
        if (!achievementId) continue;
        try {
            await prisma.studentAchievement.create({
                data: {
                    studentId,
                    achievementId,
                    progress: metrics[c.rule] ?? 0,
                },
            });
            unlocked.push({ slug: c.slug, name: c.name, tier: c.tier });
        } catch {
            // Unique-constraint race — safe to ignore.
        }
    }

    if (unlocked.length > 0) {
        await notifyUnlocks(studentId, unlocked);
    }
    return unlocked;
}

export async function awardManualAchievement(opts: {
    memberId: string;
    achievementSlug: string;
    awardedById: string;
    note?: string;
}): Promise<boolean> {
    const row = await prisma.achievement.findUnique({
        where: { slug: opts.achievementSlug },
        select: { id: true, name: true, tier: true, rule: true },
    });
    if (!row) return false;
    if (row.rule !== "MANUAL") return false;

    try {
        await prisma.studentAchievement.create({
            data: {
                studentId: opts.memberId,
                achievementId: row.id,
                awardedByUserId: opts.awardedById,
                note: opts.note,
            },
        });
        await notifyUnlocks(opts.memberId, [
            { slug: opts.achievementSlug, name: row.name, tier: row.tier },
        ]);
        return true;
    } catch {
        return false;
    }
}

export async function evaluateAllMembers(): Promise<void> {
    const students = await prisma.student.findMany({
        where: { user: { isActive: true } },
        select: { id: true },
    });
    for (const s of students) {
        await evaluateAchievements(s.id);
    }
}

async function notifyUnlocks(userId: string, unlocked: UnlockedAchievement[]): Promise<void> {
    for (const u of unlocked) {
        const tierTag = u.tier === "LEGENDARY" || u.tier === "EPIC" ? ` (${u.tier.toLowerCase()})` : "";
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    title: "Achievement unlocked",
                    message: `You unlocked "${u.name}"${tierTag}. View it on your achievements page.`,
                    type: "SUCCESS",
                    link: "/portal/achievements",
                },
            });
        } catch {
            // Notification is a nice-to-have; never fail the unlock for it.
        }
    }
}
