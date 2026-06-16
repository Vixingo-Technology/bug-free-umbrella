import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import PortalDashboardClient from "@/components/portal/portal-dashboard-client";
import AdminDashboardClient from "@/components/portal/admin/admin-dashboard-client";

export default async function PortalDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Quick role lookup so we can render the right dashboard
    let role: "ADMIN" | "INSTRUCTOR" | "STUDENT" = "STUDENT";
    try {
        const m = await prisma.member.findUnique({
            where: { id: user.id },
            select: { role: true },
        });
        if (m?.role) role = m.role;
    } catch {
        // DB not configured
    }

    if (role === "ADMIN") {
        return <AdminPortalDashboard userId={user.id} />;
    }

    return <StudentPortalDashboard userId={user.id} />;
}

async function StudentPortalDashboard({ userId }: { userId: string }) {
    let member = null;
    let unreadNotifications = 0;
    let upcomingEvents: unknown[] = [];

    try {
        member = await prisma.member.findUnique({
            where: { id: userId },
            include: {
                dojo: true,
                gradings: {
                    include: { fromRank: true, toRank: true },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                },
            },
        });

        unreadNotifications = await prisma.notification.count({
            where: { memberId: userId, isRead: false },
        });

        upcomingEvents = await prisma.event.findMany({
            where: {
                isPublished: true,
                eventDate: { gte: new Date() },
            },
            orderBy: { eventDate: "asc" },
            take: 3,
        });
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
            member={member}
            membershipStatus={membershipStatus}
            unreadNotifications={unreadNotifications}
            upcomingEvents={upcomingEvents}
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
        prisma.member.findUnique({
            where: { id: userId },
            select: { fullName: true, email: true },
        }),
        prisma.member.count(),
        prisma.member.count({ where: { role: "STUDENT" } }),
        prisma.member.count({ where: { role: "INSTRUCTOR" } }),
        prisma.member.count({ where: { role: "ADMIN" } }),
        prisma.member.count({ where: { membershipStatus: "PENDING" } }),
        prisma.member.count({ where: { membershipStatus: "SUSPENDED" } }),
        prisma.member.count({ where: { createdAt: { gte: since30 } } }),
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
        prisma.member.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, fullName: true, email: true, role: true,
                membershipStatus: true, createdAt: true,
                dojo: { select: { name: true } },
            },
        }),
        prisma.shopOrder.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true, paymentStatus: true, total: true, createdAt: true,
                member: { select: { fullName: true, email: true } },
            },
        }),
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
