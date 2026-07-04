import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProfileClient from "@/components/portal/profile-client";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member: any = null;
    let dojos: any[] = [];

    try {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            include: { student: { include: { dojo: true } } },
        });
        if (u) {
            member = {
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                phone: u.phone,
                avatarUrl: u.avatarUrl,
                role: u.roleId,
                memberNumber: u.memberNumber,
                ...(u.student ?? {}),
                dojo: u.student?.dojo ?? null,
            };
        }

        dojos = await prisma.dojo.findMany({
            where: { isActive: true },
            orderBy: { city: "asc" },
            select: { id: true, name: true, city: true },
        });
    } catch {
        // DB not configured
    }

    return <ProfileClient member={member} dojos={dojos} userId={user.id} />;
}
