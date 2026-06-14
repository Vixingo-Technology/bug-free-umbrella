import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PortalDashboardClient from "@/components/portal/portal-dashboard-client";

export default async function PortalDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    let member = null;
    let unreadNotifications = 0;
    let upcomingEvents: any[] = [];

    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
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
            where: { memberId: user.id, isRead: false },
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

    // Determine membership status
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
            userId={user.id}
        />
    );
}
