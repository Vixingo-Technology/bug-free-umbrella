import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import type { RoleId } from "@/lib/auth/load-current-user";
import PortalDashboardClient from "@/components/portal/portal-dashboard-client";
import AdminDashboardClient from "@/components/portal/admin/admin-dashboard-client";
import DojoOverview from "@/components/portal/dojo-overview";
import { getDojoSession } from "@/lib/dojo-session";
import { isDojoRole } from "@/lib/dojo-roles";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements/catalog";

type SearchParams = Promise<{
    enlistment?: string;
    denied?: string;
}>;

export default async function PortalDashboardPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Quick role lookup so we can render the right dashboard
    let role: RoleId = "STUDENT";
    try {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            select: { roleId: true },
        });
        if (u?.roleId) role = u.roleId as RoleId;
    } catch {
        // DB not configured
    }

    if (role === "ADMIN") {
        return <AdminPortalDashboard userId={user.id} />;
    }

    if (isDojoRole(role)) {
        const params = await searchParams;
        const session = await getDojoSession();
        if (!session) redirect("/login");
        return (
            <DojoOverview
                userId={session.userId}
                role={session.role}
                fullName={session.fullName}
                dojoId={session.dojo?.id ?? null}
                dojoName={session.dojo?.name ?? null}
                pendingApproval={session.pendingApproval}
                showWelcome={params.enlistment === "success"}
                showDenied={params.denied === "1"}
            />
        );
    }

    return <StudentPortalDashboard userId={user.id} />;
}

async function StudentPortalDashboard({ userId }: { userId: string }) {
    let member: any = null;
    let unreadNotifications = 0;
    let upcomingItems: any[] = [];
    let achievements: any[] = [];
    let achievementsSummary = { unlocked: 0, total: ACHIEVEMENT_CATALOG.length, pct: 0 };

    try {
        const student = await prisma.student.findUnique({
            where: { id: userId },
            include: {
                dojo: true,
                user: true,
                gradings: {
                    include: { fromRank: true, toRank: true },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                },
            },
        });
        // Flatten to the shape the existing client expects: user fields + student fields.
        if (student) {
            member = {
                ...student,
                fullName: student.user.fullName,
                email: student.user.email,
                phone: student.user.phone,
                avatarUrl: student.user.avatarUrl,
                role: student.user.roleId,
                isActive: student.user.isActive,
            };
        }

        unreadNotifications = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        const now = new Date();

        const [events, gradingApps] = await Promise.all([
            prisma.event.findMany({
                where: { isPublished: true, eventDate: { gte: now } },
                orderBy: { eventDate: "asc" },
                take: 5,
            }),
            prisma.gradingApplication.findMany({
                where: {
                    studentId: userId,
                    status: "APPROVED",
                    gradingEvent: { eventDate: { gte: now } },
                },
                include: { targetRank: true, gradingEvent: true },
                orderBy: { gradingEvent: { eventDate: "asc" } },
                take: 5,
            }),
        ]);

        const eventItems = events.map((e: any) => ({
            kind: "event" as const,
            id: e.id,
            title: e.title,
            date: e.eventDate.toISOString(),
            location: e.location ?? null,
        }));

        const gradingItems = gradingApps.map((a: any) => ({
            kind: "grading" as const,
            id: a.id,
            targetRank: a.targetRank?.name ?? "Belt test",
            date: a.gradingEvent.eventDate.toISOString(),
            location: a.gradingEvent.location ?? null,
            eventName: a.gradingEvent.name,
        }));

        upcomingItems = [...eventItems, ...gradingItems]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);

        // Achievements — read already-unlocked rows only (evaluation runs on
        // the /portal/achievements page). Build a Steam-style summary panel.
        const unlockedRows = await prisma.studentAchievement.findMany({
            where: { studentId: userId },
            select: { unlockedAt: true, achievement: { select: { slug: true } } },
        });
        const unlockedBySlug = new Map(
            unlockedRows.map((u: any) => [u.achievement.slug, u.unlockedAt]),
        );
        achievements = [...ACHIEVEMENT_CATALOG]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((a) => ({
                slug: a.slug,
                name: a.name,
                description: a.description,
                icon: a.icon,
                tier: a.tier,
                unlocked: unlockedBySlug.has(a.slug),
                unlockedAt: unlockedBySlug.get(a.slug) ?? null,
            }));
        const total = ACHIEVEMENT_CATALOG.length;
        const unlockedCount = unlockedRows.length;
        achievementsSummary = {
            unlocked: unlockedCount,
            total,
            pct: total > 0 ? Math.round((unlockedCount / total) * 100) : 0,
        };
    } catch {
        // DB not configured yet
    }

    const today = new Date();
    const expiry = member?.expiryDate ? new Date(member.expiryDate) : null;
    let membershipStatus: "Active" | "Expired" | "Expiring Soon" | "Pending" = "Pending";

    if (expiry) {
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) membershipStatus = "Expired";
        else if (daysLeft <= 30) membershipStatus = "Expiring Soon";
        else membershipStatus = "Active";
    } else if (member) {
        membershipStatus = "Active";
    }

    return (
        <PortalDashboardClient
            member={serialize(member)}
            membershipStatus={membershipStatus}
            unreadNotifications={unreadNotifications}
            upcomingItems={serialize(upcomingItems)}
            achievements={serialize(achievements)}
            achievementsSummary={achievementsSummary}
            userId={userId}
        />
    );
}

async function AdminPortalDashboard({ userId }: { userId: string }) {
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [
        member,
        totalMembers,
        students,
        instructors,
        admins,
        pendingMembers,
        suspendedMembers,
        newMembers30d,
        totalDojos,
        activeDojos,
        totalProducts,
        activeProducts,
        pendingOrders,
        paidOrders,
        revenueAgg,
        recentMembers,
        recentOrders,
    ] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true, email: true },
        }),
        prisma.user.count(),
        prisma.user.count({ where: { roleId: "STUDENT" } }),
        prisma.user.count({ where: { roleId: "INSTRUCTOR" } }),
        prisma.user.count({ where: { roleId: "ADMIN" } }),
        prisma.student.count({ where: { membershipStatus: "PENDING" } }),
        prisma.student.count({ where: { membershipStatus: "SUSPENDED" } }),
        prisma.user.count({ where: { createdAt: { gte: since30 } } }),
        prisma.dojo.count(),
        prisma.dojo.count({ where: { isActive: true } }),
        prisma.shopProduct.count(),
        prisma.shopProduct.count({ where: { isActive: true } }),
        prisma.shopOrder.count({ where: { paymentStatus: "PENDING" } }),
        prisma.shopOrder.count({ where: { paymentStatus: "PAID" } }),
        prisma.shopOrder.aggregate({
            where: { paymentStatus: "PAID" },
            _sum: { total: true },
        }),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, fullName: true, email: true, roleId: true, createdAt: true,
                student: { select: { membershipStatus: true, dojo: { select: { name: true } } } },
            },
        }).then((rows) => rows.map((r) => ({
            id: r.id,
            fullName: r.fullName,
            email: r.email,
            role: r.roleId,
            createdAt: r.createdAt,
            membershipStatus: r.student?.membershipStatus ?? null,
            dojo: r.student?.dojo ?? null,
        }))),
        prisma.shopOrder.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, paymentStatus: true, total: true, createdAt: true,
                user: { select: { fullName: true, email: true } },
            },
        }).then((rows) => rows.map((o) => ({
            ...o,
            member: o.user,
        }))),
    ]);

    const stats = {
        totalMembers,
        students,
        instructors,
        admins,
        pendingMembers,
        suspendedMembers,
        newMembers30d,
        totalDojos,
        activeDojos,
        totalProducts,
        activeProducts,
        pendingOrders,
        paidOrders,
        totalRevenue: Number(revenueAgg._sum.total ?? 0),
    };

    return (
        <AdminDashboardClient
            adminName={member?.fullName ?? "Administrator"}
            stats={stats}
            recentMembers={serialize(recentMembers) as never}
            recentOrders={serialize(recentOrders) as never}
        />
    );
}
