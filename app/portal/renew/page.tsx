import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import RenewClient from "@/components/portal/renew-client";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

export const metadata = { title: "Renew Membership — JKA Bangladesh" };

export default async function RenewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member = null;

    try {
        member = await prisma.member.findUnique({
            where: { id: user.id },
            include: { dojo: true },
        });
    } catch {
        // DB not configured
    }

    return (
        <RenewClient
            member={member}
            membershipFeeBDT={MEMBERSHIP_FEE_BDT}
            userId={user.id}
        />
    );
}
