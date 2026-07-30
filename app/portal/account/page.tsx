import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import AccountClient from "@/components/portal/account-client";

export default async function AccountPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            roleId: true,
            memberNumber: true,
            createdAt: true,
        },
    });

    if (!u) redirect("/login");

    return <AccountClient user={u} />;
}
