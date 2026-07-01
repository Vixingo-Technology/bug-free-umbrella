import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import NotificationsClient from "@/components/portal/notifications-client";

export default async function NotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let notifications: any[] = [];

    try {
        notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
    } catch {
        // DB not configured
    }

    return <NotificationsClient notifications={notifications} userId={user.id} />;
}
