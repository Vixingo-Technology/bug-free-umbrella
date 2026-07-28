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

async function gatherMetrics(studentId: string): Promise<Record<string, number>> {
    const [gradingsPassed, eventsAttended, tournaments, tournamentWins, certificates] =
        await Promise.all([
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
        ]);

    return {
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
