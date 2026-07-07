import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import NotificationsClient from "@/components/portal/notifications-client";

const NOTIFICATIONS_PAGE_SIZE = 15;

export default async function NotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let notifications: any[] = [];
    let totalCount = 0;

    try {
        [notifications, totalCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: NOTIFICATIONS_PAGE_SIZE,
            }),
            prisma.notification.count({ where: { userId: user.id } }),
        ]);
    } catch {
        // DB not configured
    }

    return (
        <NotificationsClient
            notifications={notifications}
            userId={user.id}
            totalCount={totalCount}
            pageSize={NOTIFICATIONS_PAGE_SIZE}
        />
    );
}
