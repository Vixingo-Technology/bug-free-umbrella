import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProfileClient from "@/components/portal/profile-client";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;
    let dojos: any[] = [];

    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
            include: { dojo: true },
        });

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
