import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import AttendanceClient, {
    type AttendanceMember,
} from "@/components/dojo/attendance-client";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";

export const metadata: Metadata = {
    title: "Attendance — Dojo Dashboard",
};

const SAMPLE: AttendanceMember[] = [
    { id: "sample-1", fullName: "Tahmid Rahman", attendance: [true, true, false, true, true], unlockedSlugs: [] },
    { id: "sample-2", fullName: "Anika Hossain", attendance: [true, false, true, true, true], unlockedSlugs: [] },
    { id: "sample-3", fullName: "Ibrahim Khan",  attendance: [true, true, true, true, false], unlockedSlugs: [] },
    { id: "sample-4", fullName: "Sumaiya Chowdhury", attendance: [false, true, true, false, true], unlockedSlugs: [] },
];

export default async function AttendancePage() {
    const session = await requireDojoRole("INSTRUCTOR");

    const { weekDates, members } = session.dojo
        ? await loadRealAttendance(session.dojo.id)
        : { weekDates: weekMondayThroughFriday(), members: SAMPLE };

    const manualAchievements = ACHIEVEMENT_CATALOG.filter((a) => a.rule === "MANUAL");

    return (
        <>
            <DojoPageHeader
                eyebrow="This week"
                title="Attendance"
                description={
                    session.dojo
                        ? `Mon–Fri check-ins for ${session.dojo.name}. Tap a day to toggle attendance.`
                        : "Sample week shown until your dojo is approved."
                }
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <QrCode size={14} />
                        Show check-in QR
                    </button>
                }
            />

            <AttendanceClient
                editable={!!session.dojo}
                weekDates={weekDates}
                members={members}
                manualAchievements={manualAchievements.map((a) => ({
                    slug: a.slug,
                    name: a.name,
                    tier: a.tier,
                    description: a.description,
                }))}
            />
        </>
    );
}

function weekMondayThroughFriday(): string[] {
    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - (day - 1));
    return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
    });
}

async function loadRealAttendance(
    dojoId: string,
): Promise<{ weekDates: string[]; members: AttendanceMember[] }> {
    const weekDates = weekMondayThroughFriday();
    const monday = new Date(`${weekDates[0]}T00:00:00Z`);
    const friday = new Date(`${weekDates[4]}T23:59:59Z`);

    const rows = await prisma.student.findMany({
        where: { dojoId, user: { isActive: true } },
        orderBy: { user: { fullName: "asc" } },
        select: {
            id: true,
            user: { select: { fullName: true } },
            attendance: {
                where: { date: { gte: monday, lte: friday } },
                select: { date: true, present: true },
            },
            achievements: {
                select: { achievement: { select: { slug: true } } },
            },
        },
    });

    const members: AttendanceMember[] = rows.map((m: typeof rows[number]) => {
        const grid: boolean[] = [false, false, false, false, false];
        for (const a of m.attendance) {
            const ymd = a.date.toISOString().slice(0, 10);
            const idx = weekDates.indexOf(ymd);
            if (idx >= 0) grid[idx] = a.present;
        }
        return {
            id: m.id,
            fullName: m.user.fullName,
            attendance: grid,
            unlockedSlugs: m.achievements.map((r: { achievement: { slug: string } }) => r.achievement.slug),
        };
    });

    return { weekDates, members };
}
